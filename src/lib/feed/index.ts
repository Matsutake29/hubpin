import type { NormalizedEntry } from './types'
import type { Database } from '@/types/database.types'
import { fetchWordPress } from './wordpress'
import { fetchZenn } from './zenn'
import { fetchGitHub } from './github'

// 取得に必要な列だけを DB の型から取り出す。
// 🚨 独自に型を書き直さない。列名や型が変わったら、ここで tsc が落ちてほしい。
type FeedSource = Pick<
  Database['public']['Tables']['feed_sources']['Row'],
  'provider' | 'endpoint_url' | 'fallback_url' | 'max_entries'
>

// 🚨 並べ替えと件数の保証はここ1箇所だけ。アダプター側には書かない。
//    ⚠️ 媒体ごとに書くと、書き忘れても型は通る。しかも Zenn は新しい順で返るので
//       画面を見ても気づけない（壊れるのは WP のフォールバック経路だけ）。
export function sortAndTake(entries: NormalizedEntry[], max: number): NormalizedEntry[] {
  return [...entries]
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
    .slice(0, max)
}

async function fetchRaw(source: FeedSource): Promise<NormalizedEntry[]> {
  switch (source.provider) {
    case 'wordpress':
      return fetchWordPress(source.endpoint_url, source.fallback_url, source.max_entries)

    case 'zenn':
      return fetchZenn(source.endpoint_url)

    case 'github':
      return fetchGitHub(source.endpoint_url, source.max_entries)

    // 🚨 空配列を返さない。保存側が「0件で成功」と解釈して、既存のエントリーを全部消す。
    default:
      throw new Error(`未実装、または不明な provider: ${source.provider}`)
  }
}

export async function fetchEntries(source: FeedSource): Promise<NormalizedEntry[]> {
  return sortAndTake(await fetchRaw(source), source.max_entries)
}
