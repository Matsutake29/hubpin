// 外部へ（別タブで）開くリンクに付ける印（#53）。
// ⭐ 以前は ↗ と sr-only の文言を4か所にベタ書きしていた。並べ替えの矢印を ArrowIcon にしたのと同じく、
//    1か所にまとめて、片方だけ直る形を無くす。
// ↗ は読み上げると「右上向き矢印」になって邪魔なので隠し、別タブで開くことは語で伝える（#51-9）
export function ExternalMark({ className = 'ml-1.5 text-xs font-normal text-muted' }) {
  return (
    <>
      <span aria-hidden="true" className={className}>
        ↗
      </span>
      <span className="sr-only">（新しいタブで開く）</span>
    </>
  )
}
