import type { Database } from '@/types/database.types'
import { ExternalMark } from '@/components/external-mark'
import { byPublishedDesc } from '@/lib/feed/order'
import { NoteCard, OpenCardProvider } from './note-card'

export type Item = Pick<
  Database['public']['Tables']['items']['Row'],
  'id' | 'type' | 'title' | 'description' | 'url' | 'sort_order'
> & {
  // 🚨 公開ページで使わない列は持たない（#52）。Client Component に渡した値は
  //    RSC ペイロードとして HTML に埋め込まれ、誰でも読める。
  //    last_fetched_at は「本人だけが見る」とした運用情報（fetch-status.tsx）。
  feed_sources: {
    feed_entries: Pick<
      Database['public']['Tables']['feed_entries']['Row'],
      'id' | 'title' | 'url' | 'published_at' | 'thumbnail_url'
    >[]
  } | null
}

// 🚨 Server Component（#52-3）。以前はファイル全体が 'use client' で、note が1枚も無いページでも
//    全カードのマークアップが JS として配られ、ハイドレートされていた。
//    動きがあるのは note の開閉だけなので、そこだけを note-card.tsx（Client）に切り出した。
//    ⭐ 「なぜ Client にしたか」に「note を開くためのボタンだから」と1文で答えられる境界にする。
export function CardGrid({ items }: { items: Item[] }) {
  return (
    <OpenCardProvider>
      {/* 見出しが表示名の h1 だけなので、一覧に名前を付けてランドマーク代わりにする（#51-8） */}
      <ul aria-label="カード一覧" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          // URL の無いカードは note と同じく、その場で開く形にする（以前の分岐と同じ）
          if ((item.type !== 'feed' && item.type !== 'link') || !item.url)
            return <NoteCard key={item.id} item={item} />

          // ⭐ 並べ替えはサーバーで1回だけ（ビルドと再生成のとき）。ブラウザで開くたびにやり直さない。
          //    比較は取得側（lib/feed/index.ts）と同じ関数を使う
          const entries = [...(item.feed_sources?.feed_entries ?? [])].sort(byPublishedDesc)
          // li を縦の flex にしてカードは grow で余りを埋める（note-card.tsx と同じ）
          return (
            <li key={item.id} className="flex flex-col">
              {item.type === 'feed' && item.url ? (
                <div className="pin-card grow">
                  <span aria-hidden="true" className="pin-head pin-head--fill" />
                  <a
                    className="font-bold"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.title}
                    <ExternalMark />
                  </a>
                  {entries.length > 0 && (
                    <ul className="mt-1 flex flex-col gap-1.5">
                      {entries.map((entry) => (
                        <li key={entry.id}>
                          <a
                            className="text-sm leading-6 text-muted hover:underline"
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {entry.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {entries.length === 0 && item.description && (
                    <span className="line-clamp-2 text-sm leading-6 text-muted">
                      {item.description}
                    </span>
                  )}
                </div>
              ) : (
                <a
                  className="pin-card grow"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {/* 塗り＝外部へ飛ぶ（link / feed）。note だけ中空で、その場で開くことを示す */}
                  <span aria-hidden="true" className="pin-head pin-head--fill" />
                  <span className="font-bold">
                    {item.title}
                    <ExternalMark />
                  </span>
                  {/* 🚨 ここだけ2行で打ち切る。link のカードは一覧の1枚で、
                    高さが揃わないとグリッドが崩れる。note / feed の展開部（下）は
                    開いて全文を読む場所なので切らない */}
                  {item.description && (
                    <span className="line-clamp-2 text-sm leading-6 text-muted">
                      {item.description}
                    </span>
                  )}
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </OpenCardProvider>
  )
}
