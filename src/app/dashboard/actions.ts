'use server'

import { createClient } from '@/utils/supabase/server'
import { itemSchema, type ItemInput } from '@/lib/schemas/item'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { revalidatePublicPage } from '@/lib/revalidate'

// フォームが送ってきた生の値。検証に失敗したとき画面へ返して入力を保つ
type ItemValues = {
  title: string
  type: string
  url: string
  description: string
  visible: boolean
}

export type ItemState =
  | {
      errors?: Record<string, { type: string; message: string }>
      values?: ItemValues
    }
  | undefined

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// createItem と updateItem は、ログイン確認 → 生値の組み立て → 検証 → エラー整形 まで
// 20行が完全に同じだった。1箇所にまとめる。
// 🚨 export しない。'use server' のファイルで export した関数は全部 Server Action になる
//    （＝外から呼べるエンドポイントが増える）。ここは内部のヘルパーなので出さない。
type PreparedItem =
  | { ok: true; supabase: SupabaseClient; userId: string; data: ItemInput }
  | { ok: false; state: ItemState }

// ⭐ 判別可能なユニオンで返す。呼び出し側が ok を見た時点で supabase と userId が
//    確定するので、あとで ! を書かずに済む
async function prepareItem(formData: FormData): Promise<PreparedItem> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth) {
    return {
      ok: false,
      state: { errors: { root: { type: 'server', message: 'ログインが必要です' } } },
    }
  }

  const raw = {
    title: String(formData.get('title') ?? ''),
    type: String(formData.get('type') ?? ''),
    url: String(formData.get('url') ?? ''),
    description: String(formData.get('description') ?? ''),
    visible: formData.get('visible') === 'on',
  }

  const parsed = itemSchema.safeParse(raw)
  if (!parsed.success) {
    const errors: Record<string, { type: string; message: string }> = {}
    for (const issue of parsed.error.issues) {
      errors[issue.path.join('.')] = { type: 'server', message: issue.message }
    }
    // 🚨 parsed.data は失敗時に存在しない。ユーザーが打った raw を返す
    return { ok: false, state: { errors, values: raw } }
  }

  return { ok: true, supabase, userId: auth.claims.sub, data: parsed.data }
}

export async function createItem(prevState: ItemState, formData: FormData): Promise<ItemState> {
  const prepared = await prepareItem(formData)
  if (!prepared.ok) return prepared.state
  const { supabase, userId, data: parsedData } = prepared

  const { data: last } = await supabase
    .from('items')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('items').insert({
    ...parsedData,
    url: parsedData.url || null,
    description: parsedData.description || null,
    user_id: userId,
    sort_order: (last?.sort_order ?? 0) + 1,
  })

  if (error) {
    console.error('insert failed:', error.message)
    return { errors: { root: { type: 'server', message: '保存に失敗しました' } } }
  }
  revalidatePath('/dashboard')
  await revalidatePublicPage(supabase, userId)
  // 🚨 ここを書き忘れていた（Issue #27）。updateItem は redirect しているのに
  //    createItem だけしておらず、保存に成功しても追加画面に留まっていた。
  //    React 19 が送信後にフォームをリセットするので、画面は「入力が消えただけ」に見え、
  //    成功したのか失敗したのかが利用者から区別できなかった（実際は保存できている）。
  redirect('/dashboard')
}

export async function updateItem(
  // 🚨 id は第1引数。bind が固定するのは先頭の引数で、
  //    useActionState が渡す (prevState, formData) がその後ろに来る
  id: string,
  prevState: ItemState,
  formData: FormData,
): Promise<ItemState> {
  const prepared = await prepareItem(formData)
  if (!prepared.ok) return prepared.state
  const { supabase, userId, data: parsedData } = prepared

  const { data, error } = await supabase
    .from('items')
    .update({
      ...parsedData,
      url: parsedData.url || null,
      description: parsedData.description || null,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('update failed:', error.message)
    return { errors: { root: { type: 'server', message: '保存に失敗しました' } } }
  }

  if (!data) {
    return { errors: { root: { type: 'server', message: 'データが見つかりません' } } }
  }
  revalidatePath('/dashboard')
  await revalidatePublicPage(supabase, userId)
  redirect('/dashboard')
}

export async function toggleVisible(id: string, visible: boolean) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth) return

  const { data, error } = await supabase
    .from('items')
    .update({ visible: !visible })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('toggle failed:', error.message)
    return
  }
  if (!data) {
    console.error('toggle: no row matched')
    return
  }
  revalidatePath('/dashboard')
  await revalidatePublicPage(supabase, auth.claims.sub)
}

export async function moveItem(id: string, direction: 'up' | 'down') {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth) return

  const { data: items, error } = await supabase
    .from('items')
    .select('sort_order, id')
    .order('sort_order')

  if (error) {
    console.error('move: failed to load items:', error.message)
    return
  }
  if (!items || items.length === 0) {
    console.error('move: no items to reorder')
    return
  }

  // 🚨 ボタンを disabled にしても Server Action は直接叩けるので、範囲はここでも守る。
  //    index が -1 になるのは「存在しない id」と「他人のカード」の両方
  //    （他人の行は RLS で items に入ってこない）
  const index = items.findIndex((item) => item.id === id)
  if (index === -1) return
  if (direction === 'up' && index === 0) return
  if (direction === 'down' && index === items.length - 1) return

  const targetIndex = direction === 'up' ? index - 1 : index + 1
  const currentItem = items[index]
  const targetItem = items[targetIndex]

  // ⭐ 2行の入れ替えを1つのトランザクションでやる。
  //    以前は update を2回に分けて撃っていて、1回目だけ成功すると2行が同じ sort_order を
  //    持ったまま残った（この列に UNIQUE が無いので DB は何も言わない）。
  //    🚨 だから失敗しても「片方だけ動いたかもしれない」としか言えなかった。
  //    いまは nothing changed と書ける。それがこの置き換えの成果。
  // 📌 関数は security invoker（既定）なので、関数の中でも RLS が効く。
  //    他人の行は select が NULL を返し、関数側が raise exception で止める。
  const { error: swapError } = await supabase.rpc('swap_item_order', {
    a_id: currentItem.id,
    b_id: targetItem.id,
  })
  if (swapError) {
    console.error('move: swap failed, nothing changed:', swapError.message)
    return
  }

  revalidatePath('/dashboard')
  await revalidatePublicPage(supabase, auth.claims.sub)
}

export async function deleteItem(id: string) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth) return

  const { data, error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('delete failed:', error.message)
    return
  }
  if (!data) {
    console.error('delete: no row matched')
    return
  }
  revalidatePath('/dashboard')
  await revalidatePublicPage(supabase, auth.claims.sub)
}
