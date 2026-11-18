'use server'

import { createClient } from '@/utils/supabase/server'
import { itemSchema, itemTypeSchema, type ItemInput } from '@/lib/schemas/item'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { revalidatePublicPage } from '@/lib/revalidate'

// フォームが送ってきた値。検証に失敗したとき画面へ返して入力を保つ。
// ⭐ 手で型を書かず、zod の型から導く（#53-8）。以前は type: string の手書きの型で、
//    フォーム側で `as ItemInput` と黙らせていた。type=foo が来ると ItemInput を騙った値が
//    useForm に入っていた。いまは type を検証してから返すので、キャストが要らない。
export type ItemValues = Required<ItemInput>

export type ItemState =
  | {
      errors?: Record<string, { type: string; message: string }>
      values?: ItemValues
    }
  | undefined

// 🚨 supabase-js の型名 SupabaseClient と同じ名前にしない（#53）。cookie ベースのクライアントだと名前で分かるようにする。
type CookieClient = Awaited<ReturnType<typeof createClient>>

// createItem と updateItem は、ログイン確認 → 生値の組み立て → 検証 → エラー整形 まで
// 20行が完全に同じだった。1箇所にまとめる。
// 🚨 export しない。'use server' のファイルで export した関数は全部 Server Action になる
//    （＝外から呼べるエンドポイントが増える）。ここは内部のヘルパーなので出さない。
// DB に書く形。'' を null に変えるのはここ（prepareItem）1箇所だけ（#53-4）
type ItemRow = Omit<ItemInput, 'url' | 'description'> & {
  url: string | null
  description: string | null
}

type PreparedItem =
  | { ok: true; supabase: CookieClient; userId: string; data: ItemRow }
  | { ok: false; state: ItemState }

// ⭐ 判別可能なユニオンで返す。呼び出し側が ok を見た時点で supabase と userId が
//    確定するので、あとで ! を書かずに済む
// 🚨 以下2つも export しない（Server Action にしない）。
// ログインの確認。書き込みの経路6つが毎回同じ3行を書いていた（#53）
async function requireAuth(): Promise<{ supabase: CookieClient; userId: string } | null> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth) return null
  return { supabase, userId: auth.claims.sub }
}

// items を書いたあとの再検証。ダッシュボードと公開ページの両方を捨てる。
// ⭐ 1行にまとめておけば、片方だけ書き忘れる形が無くなる（resetDemoData で起きていた・#53-1）
async function revalidateAfterWrite(supabase: CookieClient, userId: string) {
  revalidatePath('/dashboard')
  await revalidatePublicPage(supabase, userId)
}

async function prepareItem(formData: FormData): Promise<PreparedItem> {
  const session = await requireAuth()
  if (!session) {
    return {
      ok: false,
      state: { errors: { root: { type: 'server', message: 'ログインが必要です' } } },
    }
  }

  const rawType = itemTypeSchema.safeParse(formData.get('type'))
  const raw: ItemValues = {
    title: String(formData.get('title') ?? ''),
    // 想定外の値は検証で落とす。画面へ返す値は link に戻す（select に無い値は表示できない）
    type: rawType.success ? rawType.data : 'link',
    url: String(formData.get('url') ?? ''),
    description: String(formData.get('description') ?? ''),
    visible: formData.get('visible') === 'on',
  }

  const parsed = itemSchema.safeParse({ ...raw, type: formData.get('type') })
  if (!parsed.success) {
    const errors: Record<string, { type: string; message: string }> = {}
    for (const issue of parsed.error.issues) {
      errors[issue.path.join('.')] = { type: 'server', message: issue.message }
    }
    // 🚨 parsed.data は失敗時に存在しない。ユーザーが打った raw を返す
    return { ok: false, state: { errors, values: raw } }
  }

  return {
    ok: true,
    ...session,
    data: {
      ...parsed.data,
      url: parsed.data.url || null,
      description: parsed.data.description || null,
    },
  }
}

export async function createItem(prevState: ItemState, formData: FormData): Promise<ItemState> {
  const prepared = await prepareItem(formData)
  if (!prepared.ok) return prepared.state
  const { supabase, userId, data: parsedData } = prepared

  const { data: last, error: lastError } = await supabase
    .from('items')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 採番の元が読めないまま入れると、既存のカードがあっても sort_order = 1 で入り、
  // 並べ替えのボタンが効かないカードができる（#48）
  if (lastError) {
    console.error('sort_order の採番に失敗:', lastError.message)
    return { errors: { root: { type: 'server', message: '保存に失敗しました' } } }
  }

  const { error } = await supabase.from('items').insert({
    ...parsedData,
    user_id: userId,
    sort_order: (last?.sort_order ?? 0) + 1,
  })

  if (error) {
    console.error('insert failed:', error.message)
    return { errors: { root: { type: 'server', message: '保存に失敗しました' } } }
  }
  await revalidateAfterWrite(supabase, userId)
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
    .update(parsedData)
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
  await revalidateAfterWrite(supabase, userId)
  redirect('/dashboard')
}

export async function toggleVisible(id: string, visible: boolean) {
  const session = await requireAuth()
  if (!session) return
  const { supabase, userId } = session

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
  await revalidateAfterWrite(supabase, userId)
}

export async function moveItem(id: string, direction: 'up' | 'down') {
  const session = await requireAuth()
  if (!session) return
  const { supabase, userId } = session

  const { data: items, error } = await supabase
    .from('items')
    .select('sort_order, id')
    .order('sort_order')
    // 🚨 sort_order には UNIQUE が無く、同値の行の順序は保証されない（#46-8）。
    //    id で決定的にしておかないと、並びが再生成ごとに入れ替わり、上下ボタンが別のペアを入れ替える。
    .order('id')

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

  await revalidateAfterWrite(supabase, userId)
}

export async function deleteItem(id: string) {
  const session = await requireAuth()
  if (!session) return
  const { supabase, userId } = session

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
  await revalidateAfterWrite(supabase, userId)
}
