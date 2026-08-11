'use server'

import { createClient } from '@/utils/supabase/server'
import { itemSchema } from '@/lib/schemas/item'

// フォームが送ってきた生の値。検証に失敗したとき画面へ返して入力を保つ
type ItemValues = {
  title: string
  type: string
  url: string
  description: string
  visible: boolean
}

type ItemState = {
  errors?: Record<string, string>
  values?: ItemValues
} | undefined

// 🚨 戻り値にも ItemState を書く。書かないと返り値は各 return から推論され、
//    { _form: string } と Record<string, string> のユニオンになって errors.title が引けない
export async function createItem(
  prevState: ItemState,
  formData: FormData,
): Promise<ItemState> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth) return { errors: { _form: 'ログインが必要です' } }
  const raw = {
    title: String(formData.get('title') ?? ''),
    type: String(formData.get('type') ?? ''),
    url: String(formData.get('url') ?? ''),
    description: String(formData.get('description') ?? ''),
    visible: formData.get('visible') === 'on',
  }
  const parsed = itemSchema.safeParse(raw)
  if (!parsed.success) {
    const errors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      errors[issue.path.join('.')] = issue.message
    }
    console.log('検証エラー:', errors)
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
    return { errors: { _form: '保存に失敗しました' } }
  }
}