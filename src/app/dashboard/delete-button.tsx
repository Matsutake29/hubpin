'use client'

import { useEffect, useRef, useState } from 'react'
import { useAnnounce } from './announcer'

// 🚨 confirm() を使わない。ブラウザのモーダルは JS を止めるので
//    ページの他の操作もろとも固まるうえ、見た目もアプリと揃わない。
//    行の中で2段階に分ける（押す → やめる/削除する が出る）
// label はカードのタイトル。読み上げのボタン一覧で、どの行の削除かを区別するため（#51-6）
export function DeleteButton({ action, label }: { action: () => Promise<void>; label?: string }) {
  const [confirming, setConfirming] = useState(false)
  const announce = useAnnounce()
  const deleteRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  // 最初の描画ではフォーカスを動かさない（一覧を開いただけで「削除」に飛んでしまう）
  const toggled = useRef(false)

  // 🚨 押したボタンが別の要素に置き換わるので、何もしないとフォーカスが body に落ち、
  //    次の Tab がページの先頭から数え直しになる（item-list の disabled と同じ種類のバグ）。
  //    確認に入ったら「やめる」へ、戻ったら元の「削除」へ移す。
  //    ⭐ 「削除する」には当てない。Enter の押し続けでそのまま消えてしまう。
  useEffect(() => {
    if (!toggled.current) return
    if (confirming) cancelRef.current?.focus()
    else deleteRef.current?.focus()
  }, [confirming])

  const toggle = (next: boolean) => {
    toggled.current = true
    setConfirming(next)
  }

  if (!confirming) {
    return (
      <button
        ref={deleteRef}
        type="button"
        onClick={() => toggle(true)}
        className="shrink-0 text-sm text-muted transition-colors hover:text-fg"
      >
        {label && <span className="sr-only">「{label}」を</span>}
        削除
      </button>
    )
  }

  return (
    <span className="flex shrink-0 items-center gap-2">
      {/* やめるほうを先に置く。押し慣れた位置に「削除する」が来ないようにする */}
      <button
        ref={cancelRef}
        type="button"
        onClick={() => toggle(false)}
        className="text-sm text-muted underline underline-offset-4"
      >
        やめる
      </button>
      <form
        action={async () => {
          await action()
          // 成功したかは action から分からない（void を返す）。行が消えたかどうかで利用者には見えるので、
          // ここでは「削除した」とだけ伝える
          announce(label ? `「${label}」を削除しました` : '削除しました')
        }}
      >
        {/* 地と文字を反転させて「ここで確定する」ことを示す。
            🚨 危険色は使わない。2026-08-20 に --c-danger を足したが、あれは
            「入力が通らなかった」ことを示す色として入れたもの。削除の確定に同じ赤を当てると、
            直せる失敗（バリデーション）と直せない操作（削除）が同じ色になる */}
        <button
          type="submit"
          className="rounded-(--radius) bg-fg px-2.5 py-1 text-xs font-bold text-canvas"
        >
          {label && <span className="sr-only">「{label}」を</span>}
          削除する
        </button>
      </form>
    </span>
  )
}
