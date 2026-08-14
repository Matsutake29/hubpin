import Link from 'next/link'
import type { Database } from '@/types/database.types'
import { deleteItem, moveItem, toggleVisible } from './actions'
import { DeleteButton } from './delete-button'

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
      /* 地の色を文字に使う。bg-main はライトで暗くダークで明るい対のトークンなので、
         どちらのモードでも十分なコントラストが出る（accent はライトで足りない） */
      className="shrink-0 rounded-(--radius) bg-main px-4 py-2 text-sm font-bold text-canvas transition-colors hover:bg-main-dark"
    >
      ＋ カードを追加
    </Link>
  )
}

export function ItemList({ items }: { items: Item[] }) {
  if (items.length === 0) return <EmptyState />

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, index) => (
        <li
          key={item.id}
          /* 🚨 非公開を opacity で薄くしない。編集するために読む画面なので、
             文字のコントラストは落とさず「地の色」だけで区別する */
          className={`flex items-center gap-3 rounded-(--radius) border border-line px-3 py-3 transition-colors hover:border-main sm:gap-4 sm:px-4 ${
            item.visible ? 'bg-canvas' : 'bg-sub'
          }`}
        >
          <div className="flex shrink-0 flex-col gap-1.5 text-muted">
            <form action={moveItem.bind(null, item.id, 'up')}>
              <button
                type="submit"
                disabled={index === 0}
                aria-label="上へ移動"
                className="px-1 disabled:opacity-40"
              >
                <ArrowIcon direction="up" />
              </button>
            </form>
            <form action={moveItem.bind(null, item.id, 'down')}>
              <button
                type="submit"
                disabled={index === items.length - 1}
                aria-label="下へ移動"
                className="px-1 disabled:opacity-40"
              >
                <ArrowIcon direction="down" />
              </button>
            </form>
          </div>

          {/* min-w-0 が無いと flex アイテムが縮まず truncate が効かない */}
          <span className="min-w-0 grow truncate font-bold">{item.title}</span>

          {/* type は機械が扱う語彙なので mono */}
          <span className="shrink-0 font-mono text-xs text-muted">{item.type}</span>

          {/* 🚨 見えている語は「今の状態」で、押した先の状態ではない。
              押すと何になるかは aria-label でだけ言う（読み上げは動作を求めるため）。
              文字を「非公開にする」にすると、今どちらなのかが読めなくなる */}
          <form action={toggleVisible.bind(null, item.id, item.visible)} className="shrink-0">
            <button
              type="submit"
              aria-label={item.visible ? '非公開にする' : '公開する'}
              className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-main hover:text-main"
            >
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${item.visible ? 'bg-main' : 'bg-muted'}`}
              />
              {item.visible ? '公開' : '非公開'}
            </button>
          </form>

          <Link
            href={`/dashboard/${item.id}`}
            className="shrink-0 text-sm text-main underline underline-offset-4"
          >
            編集
          </Link>

          <DeleteButton action={deleteItem.bind(null, item.id)} />
        </li>
      ))}
    </ul>
  )
}

// 破線の枠＝まだ何も留まっていないボード。body の格子がそのまま透ける
function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-(--radius) border border-dashed border-line px-6 py-16 text-center">
      <p className="font-bold">まだカードがありません</p>
      <p className="max-w-sm text-sm leading-6 text-muted">
        分散している発信を、1枚ずつここに留めていきます。
      </p>
      <AddItemButton />
    </div>
  )
}
