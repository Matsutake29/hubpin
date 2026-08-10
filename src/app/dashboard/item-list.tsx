import Link from 'next/link'
import type { Database } from '@/types/database.types'

// 一覧が使うカラムだけを切り出す。page.tsx の select() を変えたらここが赤くなる
type Item = Pick<
  Database['public']['Tables']['items']['Row'],
  'id' | 'title' | 'type' | 'visible' | 'sort_order'
>

// 🚨 文字の ↑↓ を使わない。本文フォント（Zen Kaku Gothic New）の矢印グリフは
//    「細長い縦棒＋小さな矢頭」で、12px まで小さくすると ただの縦線に見える。
//    SVG なら小さくても形が保たれ、フォントにも依存しない
function ArrowIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === 'up' ? (
        <path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" />
      ) : (
        <path d="M6 2v8M2.5 6.5 6 10l3.5-3.5" />
      )}
    </svg>
  )
}

// 見出しの横と空状態の2箇所に出るので分けておく
export function AddItemButton() {
  return (
    <Link
      href="/dashboard/new"
      /* 🚨 色は text-[var(--c-base)] と書く。text-base は Tailwind の font-size と名前が衝突する。
         地の色を文字に使うのは、bg-main がライトで暗くダークで明るい対のトークンだから
         （どちらのモードでも十分なコントラストが出る。accent を使うとライトで足りない） */
      className="shrink-0 rounded-[var(--radius)] bg-main px-4 py-2 text-sm font-bold text-[var(--c-base)] transition-colors hover:bg-main-dark"
    >
      ＋ カードを追加
    </Link>
  )
}

export function ItemList({ items }: { items: Item[] }) {
  if (items.length === 0) return <EmptyState />

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li
          key={item.id}
          /* 🚨 非公開を opacity で薄くしない。編集するために読む画面なので、
             文字のコントラストは落とさず「地の色」だけで区別する */
          className={`flex items-center gap-3 rounded-[var(--radius)] border border-line px-3 py-3 transition-colors hover:border-main sm:gap-4 sm:px-4 ${
            item.visible ? 'bg-base' : 'bg-sub'
          }`}
        >
          {/* 🗂️ 並び替えは工程8。今は置くだけなので disabled にしておく */}
          <div className="flex shrink-0 flex-col gap-1.5 text-muted">
            <button type="button" disabled aria-label="上へ移動" className="px-1 disabled:opacity-40">
              <ArrowIcon direction="up" />
            </button>
            <button type="button" disabled aria-label="下へ移動" className="px-1 disabled:opacity-40">
              <ArrowIcon direction="down" />
            </button>
          </div>

          {/* min-w-0 が無いと flex アイテムが縮まず truncate が効かない */}
          <span className="min-w-0 grow truncate font-bold">{item.title}</span>

          {/* type は機械が扱う語彙なので mono */}
          <span className="shrink-0 font-mono text-xs text-muted">{item.type}</span>

          <span className="shrink-0 text-xs text-muted">
            {item.visible ? '公開' : '非公開'}
          </span>

          <Link
            href={`/dashboard/${item.id}`}
            className="shrink-0 text-sm text-main underline underline-offset-4"
          >
            編集
          </Link>

          {/* 🗂️ 手順5で Server Action に繋ぐ */}
          <button
            type="button"
            disabled
            className="shrink-0 text-sm text-muted disabled:opacity-40"
          >
            削除
          </button>
        </li>
      ))}
    </ul>
  )
}

// 破線の枠＝まだ何も留まっていないボード。body の格子がそのまま透ける
function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[var(--radius)] border border-dashed border-line px-6 py-16 text-center">
      <p className="font-bold">まだカードがありません</p>
      <p className="max-w-sm text-sm leading-6 text-muted">
        分散している発信を、1枚ずつここに留めていきます。
      </p>
      <AddItemButton />
    </div>
  )
}
