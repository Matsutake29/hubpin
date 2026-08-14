import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/login/actions'
import { ItemList, AddItemButton } from './item-list'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const client = await createClient()
  // proxy.ts で保護しているが、型は「未ログインの可能性」を消してくれない。
  // ここで確認すると sub が string に確定する
  const { data: auth } = await client.auth.getClaims()
  if (!auth) redirect('/login')
  const { data: profile } = await client
    .from('profiles')
    .select('username')
    .eq('id', auth.claims.sub)
    .single()

  // 🚨 .eq('user_id', ...) は書かない。RLS の auth.uid() = user_id が絞るので、
  //    ここで絞ると二重になる。非公開のカードも本人には見える
  const { data: items } = await client
    .from('items')
    .select('id, title, type, visible, sort_order')
    .order('sort_order')
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-8 sm:gap-10 sm:py-10">
      <header className="flex items-center justify-between gap-4 border-b border-line pb-4">
        {/* 誰でログインしているかを出す。デモ（guest）と本人を取り違えないため */}
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="text-lg font-bold tracking-tight text-main">Hubpin</span>
          {profile && (
            <span className="truncate font-mono text-xs text-muted">@{profile.username}</span>
          )}
        </div>

        <nav className="flex items-center gap-4 text-sm sm:gap-6">
          {/* 編集して公開ページで確かめる往復が続くので別タブで開く */}
          {profile && (
            <Link
              className="text-muted transition-colors hover:text-fg"
              href={`/${profile.username}`}
              target="_blank"
            >
              公開ページを見る
              <span aria-hidden="true" className="ml-1 text-xs">
                ↗
              </span>
            </Link>
          )}
          <form action={logout}>
            <button className="text-muted transition-colors hover:text-fg" type="submit">
              ログアウト
            </button>
          </form>
        </nav>
      </header>

      <main className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">カード</h1>
          <AddItemButton />
        </div>

        <ItemList items={items ?? []} />
      </main>
    </div>
  )
}
