// 新しい順。published_at が無いもの（日付不明）は後ろへ。
// ⭐ 取得側（index.ts の sortAndTake）と公開ページ（card-grid.tsx）の両方がこれを使う。
//    以前は同じ比較を2か所に書いていた（#52-3）。
export function byPublishedDesc(
  a: { published_at: string | null },
  b: { published_at: string | null },
): number {
  return (b.published_at ?? '').localeCompare(a.published_at ?? '')
}
