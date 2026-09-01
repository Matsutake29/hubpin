import type { NormalizedEntry } from './types'
import { parseRss } from './rss'

// Zenn は RSS が本経路。フォールバック先が無いので fallback を受け取らない。
// per_page 相当も無く全件返るので、max も受け取らない（切るのは index.ts の出口）。
export async function fetchZenn(endpoint: string): Promise<NormalizedEntry[]> {
  const res = await fetch(endpoint)

  // 🚨 ok を見ないと、エラーページを parseRss に渡して空配列になる。
  //    空配列は「取得成功・0件」として保存側に渡り、既存のエントリーを全部消す。
  if (!res.ok) {
    throw new Error(`Zenn の RSS が ${res.status}`)
  }

  return parseRss(await res.text())
}
