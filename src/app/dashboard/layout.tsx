import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/login/actions'

// 🚨 ヘッダーは page.tsx ではなくここに置く。一覧にだけヘッダーがあり、
//    追加・編集に入ると消えていた（戻る導線ごと無くなっていた）。
//    layout なら配下3画面すべてに効き、次にページを足しても付け忘れが起きない。
// 📌 認証そのものは proxy.ts が見ている。ここは「誰でログインしているか」を出すだけ
export default async function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  const client = await createClient()
  const { data: auth } = await client.auth.getClaims()
  const { data: profile } = auth
    ? await client.from('profiles').select('username').eq('id', auth.claims.sub).single()
    : { data: null }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-8 sm:gap-10 sm:py-10">
      <header className="flex items-center justify-between gap-4 border-b border-line pb-4">
        {/* 誰でログインしているかを出す。デモ（guest）と本人を取り違えないため */}
        <div className="flex min-w-0 items-baseline gap-3">
          {/* 一覧へ戻る導線を兼ねる。ロゴは各画面から必ず見えるので、
              「戻る」を別に置くより迷う場所が少ない */}
          <Link className="text-lg font-bold tracking-tight text-main" href="/dashboard">
            Hubpin
          </Link>
          {profile && (
            <span className="truncate font-mono text-xs text-muted">@{profile.username}</span>
          )}
        </div>

        <nav className="flex items-center gap-4 text-sm sm:gap-6">
          {/* 編集して公開ページで確かめる往復が続くので別タブで開く */}
          {profile && (
            <Link className="btn-quiet" href={`/${profile.username}`} target="_blank">
              公開ページを見る
              <span aria-hidden="true" className="ml-1 text-xs">
                ↗
              </span>
            </Link>
          )}
          <form action={logout}>
            <button className="btn-quiet" type="submit">
              ログアウト
            </button>
          </form>
        </nav>
      </header>

      {children}
    </div>
  )
}
