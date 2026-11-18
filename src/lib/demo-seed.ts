import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { revalidatePublicPage } from './revalidate'

// 🚨 型を付ける（#53-7）。items へ直に insert する唯一の生オブジェクトなので、
//    列名が変わったら tsc で落ちてほしい。付けないと、デモログインを押した瞬間に
//    console に insert failed が出るだけで、画面は空のダッシュボードになる。
export const DEMO_ITEMS: Omit<Database['public']['Tables']['items']['Insert'], 'user_id'>[] = [
  {
    type: 'link',
    title: 'Hubpin について',
    description: 'デモ用アカウントです。自由に編集してください',
    url: 'https://hub.mt-tk.com/',
    sort_order: 1,
  },
  { type: 'link', title: 'X', description: '日々の発信', url: 'https://x.com/', sort_order: 2 },
  {
    type: 'feed',
    title: 'ブログ',
    description: '最新記事が並びます',
    url: 'https://blog.mt-tk.com/',
    sort_order: 3,
  },
  { type: 'note', title: 'メモ', description: 'リンクの無いカードも置けます', sort_order: 4 },
]

// ⚠️ items を全部消すので、feed_sources も on delete cascade で消え、feed_entries も道連れになる（#53-2）。
//    feed_sources を入れる経路はアプリに無い（手で DB に入れる運用）ので、デモの「ブログ」カードは
//    記事を持てない。デモでもフィードを見せたくなったら、ここで feed_sources も入れ直す。
export async function resetDemoData(supabase: SupabaseClient<Database>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { error: deleteError } = await supabase.from('items').delete().eq('user_id', user.id)

  if (deleteError) {
    console.error('resetDemoData delete failed:', deleteError.message)
    return
  }

  const { error: insertError } = await supabase
    .from('items')
    .insert(DEMO_ITEMS.map((item) => ({ ...item, user_id: user.id })))

  if (insertError) {
    console.error('resetDemoData insert failed:', insertError.message)
    return
  }

  // 🚨 items を書いたら公開ページを再検証する（#53-1）。他の5つの書き込み経路は全部そうしているのに、
  //    ここだけ無かった。無いと /guest が最大1時間、前の人が編集した（DB にもう無い）中身を出し続ける。
  //    ⭐ 呼ぶ側（demoLogin）ではなくこの関数の中に置く。items を書く関数の責務にしておけば、書き忘れが起きない。
  await revalidatePublicPage(supabase, user.id)
}
