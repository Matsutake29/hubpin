'use server'

import { createClient } from '@/utils/supabase/server'
import { itemSchema } from '@/lib/schemas/item'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

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

async function revalidatePublicPage(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle()

  if (profile) revalidatePath(`/${profile.username}`)
}

export async function createItem(prevState: ItemState, formData: FormData): Promise<ItemState> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth) return { errors: { root: { type: 'server', message: 'ログインが必要です' } } }
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
    return { errors, values: raw }
  }
  const { data: last } = await supabase
    .from('items')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('items').insert({
    ...parsed.data,
    url: parsed.data.url || null,
    description: parsed.data.description || null,
    user_id: auth.claims.sub,
    sort_order: (last?.sort_order ?? 0) + 1,
  })

  if (error) {
    console.error('insert failed:', error.message)
    return { errors: { root: { type: 'server', message: '保存に失敗しました' } } }
  }
  revalidatePath('/dashboard')
  await revalidatePublicPage(supabase, auth.claims.sub)
}

export async function updateItem(
  // 🚨 id は第1引数。bind が固定するのは先頭の引数で、
  //    useActionState が渡す (prevState, formData) がその後ろに来る
  id: string,
  prevState: ItemState,
  formData: FormData,
): Promise<ItemState> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth) return { errors: { root: { type: 'server', message: 'ログインが必要です' } } }
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
    return { errors, values: raw }
  }

  const { data, error } = await supabase
    .from('items')
    .update({
      ...parsed.data,
      url: parsed.data.url || null,
      description: parsed.data.description || null,
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
  await revalidatePublicPage(supabase, auth.claims.sub)
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

  // 🚨 update は1回に1条件しか持てないので2回に分かれる。1回目だけ成功すると
  //    2行が同じ sort_order を持つが、この列に UNIQUE が無いので DB は何も言わない
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  const currentItem = items[index]
  const targetItem = items[targetIndex]
  const { error: error1 } = await supabase
    .from('items')
    .update({ sort_order: targetItem.sort_order })
    .eq('id', currentItem.id)
  if (error1) {
    console.error('move: first update failed, nothing changed:', error1.message)
    return
  }
  const { error: error2 } = await supabase
    .from('items')
    .update({ sort_order: currentItem.sort_order })
    .eq('id', targetItem.id)
  if (error2) {
    console.error(
      'move: second update failed, sort_order may be duplicated:',
      currentItem.id,
      targetItem.id,
      error2.message,
    )
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
