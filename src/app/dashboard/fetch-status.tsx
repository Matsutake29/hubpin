import type { Database } from '@/types/database.types'

// 一覧が使うカラムだけを切り出す。page.tsx の select() を変えたらここが赤くなる
type Source = Pick<
  Database['public']['Tables']['feed_sources']['Row'],
  'id' | 'provider' | 'last_fetched_at' | 'last_status'
>

// 🚨 timeZone を省かない。省くとサーバーのタイムゾーンで整形される。
//    ローカルは JST なので正しく見えるが、Vercel のサーバーは UTC なので
//    本番だけ9時間ずれる。ローカルでの確認が通用しない箇所。
function formatFetchedAt(value: string | null) {
  if (!value) return '未取得'
  return new Date(value).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Cron は1日1回・±59分ぶれる・失敗しても誰も見ていない。
// 「いつ取れたか」と「成功したか」を本人だけが見る場所に出す。
export function FetchStatus({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold tracking-tight">取得状況</h2>

      <ul className="flex flex-col gap-2">
        {sources.map((source) => (
          <li
            key={source.id}
            className="flex items-center gap-3 rounded-(--radius) border border-line bg-canvas px-3 py-2 sm:gap-4 sm:px-4"
          >
            {/* provider は機械が扱う語彙なので mono（item-list と揃える） */}
            <span className="min-w-0 grow truncate font-mono text-xs text-muted">
              {source.provider}
            </span>

            <span className="shrink-0 text-xs text-muted">
              {formatFetchedAt(source.last_fetched_at)}
            </span>

            {/* 🚨 色だけで状態を伝えない（WCAG 1.4.1）。赤が見えない人にも
                「失敗」という語で伝わるようにする。色は補助でしかない */}
            {source.last_status === 'failure' ? (
              <span className="shrink-0 text-xs font-bold text-danger">失敗</span>
            ) : (
              <span className="shrink-0 text-xs text-muted">成功</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
