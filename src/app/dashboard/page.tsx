import { createClient } from '@/utils/supabase/server'
import { ItemList, AddItemButton } from './item-list'

export default async function DashboardPage() {
  const client = await createClient()

  // 🚨 .eq('user_id', ...) は書かない。RLS の auth.uid() = user_id が絞るので、
  //    ここで絞ると二重になる。非公開のカードも本人には見える。
  // 📌 未ログインでの到達は proxy.ts が /login へ返す。ヘッダー（誰でログインしているか）は
  //    layout.tsx が持つので、ここで auth を引く必要はもう無い
  const { data: items } = await client
    .from('items')
    .select('id, title, type, visible, sort_order')
    .order('sort_order')

  return (
    <main className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">カード</h1>
        <AddItemButton />
      </div>

      <ItemList items={items ?? []} />
    </main>
  )
}
