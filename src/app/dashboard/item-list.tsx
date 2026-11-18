import Link from 'next/link'
import type { Database } from '@/types/database.types'
import { deleteItem, moveItem, toggleVisible } from './actions'
import { DeleteButton } from './delete-button'
import { AnnouncerProvider } from './announcer'

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
    /* なぜ bg-main なのか（accent はライトで足りない）は globals.css の .btn-primary 側に書いた。
       同じ指定が2箇所にあると、次に直すとき片方だけ直る */
    <Link href="/dashboard/new" className="btn-primary">
      ＋ カードを追加
    </Link>
  )
}

export function ItemList({ items }: { items: Item[] }) {
  if (items.length === 0) return <EmptyState />

  return (
    <AnnouncerProvider>
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
            {/* 🚨 disabled ではなく aria-disabled。disabled な要素はブラウザ仕様で
              フォーカスを保持できず、「上へ」を押して1番目に着いた瞬間に
              index === 0 が真になって disabled になり、フォーカスが消えていた。
              ⭐ 2026-08-21 にキーボードで切り分けた。移動先が1番目にならない場合
              （3番目→2番目）はフォーカスが残ったので、原因は Server Action の
              再レンダリングではなく disabled だと確定した。
              ⚠️ aria-disabled は送信を止めない。止めなくてよい —— actions.ts の
              moveItem が index === 0 / items.length - 1 を先に return しており、
              「ボタンを disabled にしても Server Action は直接叩ける」前提で
              元から守ってあるため（actions.ts の同名コメント）。
              🚨 opacity で薄くしない。aria-disabled は「無効だ」と伝えるだけで
              要素自体は生きているので、WCAG 1.4.11 の「無効な部品」例外に
              寄りかかる根拠が弱い。--c-line-strong（ライト 3.54:1 / ダーク 3.46:1）
              へ落として、弱く見せつつ境界の 3:1 は満たす */}
            <div className="flex shrink-0 flex-col text-muted">
              <form action={moveItem.bind(null, item.id, 'up')}>
                <button
                  type="submit"
                  aria-disabled={index === 0}
                  // 🚨 名前にカードのタイトルを入れる。全行が「上へ移動」だと、読み上げの
                  //    ボタン一覧で同じ名前が並び、目的の行を選べない（#51-6）
                  aria-label={`「${item.title}」を上へ移動`}
                  className="flex h-6 w-6 items-center justify-center aria-disabled:cursor-not-allowed aria-disabled:text-line-strong"
                >
                  <ArrowIcon direction="up" />
                </button>
              </form>
              <form action={moveItem.bind(null, item.id, 'down')}>
                <button
                  type="submit"
                  aria-disabled={index === items.length - 1}
                  aria-label={`「${item.title}」を下へ移動`}
                  className="flex h-6 w-6 items-center justify-center aria-disabled:cursor-not-allowed aria-disabled:text-line-strong"
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
              文字を「非公開にする」にすると、今どちらなのかが読めなくなる。
              🚨 aria-label で動作を言わない。aria-label は中の文字を上書きするので、
              読み上げでは全行が「非公開にする」になり、どれが公開中か分からなくなる。
              音声操作で画面の語（「非公開」）を言っても押せない（WCAG 2.5.3）。
              ⭐ 見えている語を名前の先頭に残し、押した先は sr-only で後ろに足す。
              🚨 枠は border-line ではない。押すと公開状態が変わるボタンなので
              「操作できる部品の境界」として 3:1 が要る（--c-border は 1.26:1）。
              ⭐ すぐ外の <li> の枠は行の区切り＝装飾なので border-line のまま */}
            <form action={toggleVisible.bind(null, item.id, item.visible)} className="shrink-0">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-1 text-xs text-muted transition-colors hover:border-main hover:text-main"
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${item.visible ? 'bg-main' : 'bg-muted'}`}
                />
                {item.visible ? '公開' : '非公開'}
                <span className="sr-only">
                  ：「{item.title}」（押すと{item.visible ? '非公開' : '公開'}にする）
                </span>
              </button>
            </form>

            <Link
              href={`/dashboard/${item.id}`}
              className="shrink-0 text-sm text-main underline underline-offset-4"
            >
              <span className="sr-only">「{item.title}」を</span>
              編集
            </Link>

            <DeleteButton action={deleteItem.bind(null, item.id)} label={item.title} />
          </li>
        ))}
      </ul>
    </AnnouncerProvider>
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
