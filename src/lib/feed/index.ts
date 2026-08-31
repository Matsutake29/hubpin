import type { NormalizedEntry } from './types'
import type { Database } from '@/types/database.types'
import { fetchWordPress } from './wordpress'

// 取得に必要な列だけを DB の型から取り出す。
// 🚨 独自に型を書き直さない。列名や型が変わったら、ここで tsc が落ちてほしい。
type FeedSource = Pick<
  Database['public']['Tables']['feed_sources']['Row'],
  'provider' | 'endpoint_url' | 'fallback_url' | 'max_entries'
>

export async function fetchEntries(source: FeedSource): Promise<NormalizedEntry[]> {
  switch (source.provider) {
    case 'wordpress':
      return fetchWordPress(source.endpoint_url, source.fallback_url, source.max_entries)

    // 🚧 zenn は手順4 / github は手順5。
    // 🚨 空配列を返さない。保存側が「0件で成功」と解釈して、既存のエントリーを全部消す。
    default:
      throw new Error(`未実装、または不明な provider: ${source.provider}`)
  }
}