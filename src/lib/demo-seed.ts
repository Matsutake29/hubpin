import type { SupabaseClient } from '@supabase/supabase-js'

export const DEMO_ITEMS = [
  { type: 'link', title: 'Hubpin について', description:
'デモ用アカウントです。自由に編集してください', url: 'https://hub.mt-tk.com/',
sort_order: 1 },
  { type: 'link', title: 'X',             description: '日々の発信',
              url: 'https://x.com/',        sort_order: 2 },
  { type: 'feed', title: 'ブログ',         description: '最新記事が並びます',
                url: 'https://blog.mt-tk.com/', sort_order: 3 },
  { type: 'note', title: 'メモ',           description: 'リンクの無いカードも置けます',
                                                sort_order: 4 },
]

export async function resetDemoData(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

    const { data: deleted, error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('user_id', user.id)
      .select()

    if (deleteError) {
      console.error('resetDemoData delete failed:', deleteError.message)
      return
    }
    console.log('deleted:', deleted.length)

    const { data: inserted, error: insertError } = await supabase
      .from('items')
      .insert(DEMO_ITEMS.map((item) => ({ ...item, user_id: user.id })))
      .select()

    if (insertError) {
      console.error('resetDemoData insert failed:', insertError.message)
      return
    }
    console.log('inserted:', inserted.length)
}