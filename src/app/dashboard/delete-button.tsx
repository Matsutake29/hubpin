'use client'

import { useState } from 'react'

// 🚨 confirm() を使わない。ブラウザのモーダルは JS を止めるので
//    ページの他の操作もろとも固まるうえ、見た目もアプリと揃わない。
//    行の中で2段階に分ける（押す → やめる/削除する が出る）
export function DeleteButton({ action }: { action: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="shrink-0 text-sm text-muted transition-colors hover:text-fg"
      >
        削除
      </button>
    )
  }

  return (
    <span className="flex shrink-0 items-center gap-2">
      {/* やめるほうを先に置く。押し慣れた位置に「削除する」が来ないようにする */}
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-sm text-muted underline underline-offset-4"
      >
        やめる
      </button>
      <form action={action}>
        {/* 地と文字を反転させて「ここで確定する」ことを示す。
            🚨 赤は使わない。トークンに危険色が無く、v1 は8色で凍結している */}
        <button
          type="submit"
          className="rounded-(--radius) bg-fg px-2.5 py-1 text-xs font-bold text-canvas"
        >
          削除する
        </button>
      </form>
    </span>
  )
}
