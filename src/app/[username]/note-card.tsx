'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Item } from './card-grid'

// note の開閉だけを持つ Client Component（#52-3）。card-grid.tsx は Server Component。
//
// ①-1 開いているカードの id を1つだけ持つ。何も開いていない状態を null で表す。
// ⭐ 「同時に開くのは1枚だけ」を保つため、状態は各カードではなく一覧で1つだけ持つ（Context）。
//    Provider は子に Server Component の出力（feed / link のカード）をそのまま受け取れるので、
//    それらは JS にならない。
const OpenCardContext = createContext<{
  openId: string | null
  setOpenId: (id: string | null) => void
}>({ openId: null, setOpenId: () => {} })

export function OpenCardProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)
  return <OpenCardContext value={{ openId, setOpenId }}>{children}</OpenCardContext>
}

export function NoteCard({ item }: { item: Pick<Item, 'id' | 'title' | 'description'> }) {
  const { openId, setOpenId } = useContext(OpenCardContext)
  const isOpen = openId === item.id

  // 開いたカードだけ全幅にする。col-span-3 ではない（列数が 3/2/1 と変わっても効くように）。
  // li を縦の flex にしてカードは grow で余りを埋める。h-full だと「行の高さ」が
  // 親に解決されてしまい、展開部のぶんだけ次の行へはみ出す
  return (
    <li className={`flex flex-col ${isOpen ? 'col-span-full' : ''}`}>
      <button
        type="button"
        // 開いている間はカードと展開部を1枚の紙として見せる（下の角丸を落として地続きにする）
        className={`pin-card grow text-left ${isOpen ? 'rounded-b-none' : ''}`}
        aria-expanded={isOpen}
        aria-controls={`panel-${item.id}`}
        onClick={() => setOpenId(isOpen ? null : item.id)}
      >
        <span aria-hidden="true" className="pin-head" />
        <span className="font-bold">{item.title}</span>
      </button>
      <div
        id={`panel-${item.id}`}
        hidden={!isOpen}
        // 上辺を持たない。カードの border-bottom がそのまま区切り線になる
        className="pin-panel rounded-(--radius) rounded-t-none border border-t-0 bg-sub p-5 text-sm leading-7"
      >
        {item.description}
      </div>
    </li>
  )
}
