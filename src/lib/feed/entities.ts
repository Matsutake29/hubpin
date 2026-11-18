// WP REST の title.rendered と RSS のタイトルは HTML 文字列なので、`&` は `&amp;` で来る。
// React はテキストをエスケープするので、復号しないと `&amp;` がそのまま画面に出る。
//
// 🚨 `&amp;` は最後に戻す。先に戻すと `&amp;lt;` → `&lt;` → `<` と二重に復号される。
const NAMED: Record<string, string> = {
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (match, dec: string) => fromCodePointOr(match, Number.parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (match, hex: string) =>
      fromCodePointOr(match, Number.parseInt(hex, 16)),
    )
    .replace(/&(lt|gt|quot|apos|nbsp);/g, (_, name: string) => NAMED[name])
    .replace(/&amp;/g, '&')
}

// 範囲外の数値参照（&#99999999;）で String.fromCodePoint が RangeError を投げないようにする。
function fromCodePointOr(original: string, codePoint: number): string {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return original
  return String.fromCodePoint(codePoint)
}
