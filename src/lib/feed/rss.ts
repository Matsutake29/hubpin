import type { NormalizedEntry } from './types'
import { XMLParser } from 'fast-xml-parser'
import { toIsoOrNull } from './date'
import { decodeEntities } from './entities'

type RssFeed = {
  rss?: {
    channel?: {
      item?: RssItem | RssItem[]
    }
  }
}

// 🚨 fast-xml-parser はタグの中身を推測で型変換する。parseTagValue: false でも
//    属性付きタグ（<title type="html">）はオブジェクトで返る。
//    unknown にしておけば、textOf() を通さないと使えない＝tsc が正規化を強制する。
type RssItem = {
  title?: unknown
  link?: unknown
  pubDate?: unknown
  enclosure?: { '@_url'?: unknown }
}

// 🚨 parseTagValue: false にしないと <title>2026</title> は number、<pubDate>20260819</pubDate> も
//    number になる。後者は new Date(20260819) が 1970-01-01 という「妥当な日付」を作り、
//    toIsoOrNull の NaN チェックをすり抜けて誤った日付で並ぶ（5.11 で実測）。
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false })

// 文字列ならそのまま、属性付きタグなら本文（#text）、それ以外は空として扱う。
function textOf(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && '#text' in value) {
    const text = (value as { '#text'?: unknown })['#text']
    return typeof text === 'string' ? text : ''
  }
  return ''
}

export function parseRss(xml: string): NormalizedEntry[] {
  const parsed = parser.parse(xml)
  const feed: RssFeed = parsed
  const raw = feed.rss?.channel?.item

  const items: RssItem[] = Array.isArray(raw) ? raw : raw ? [raw] : []

  const entries: NormalizedEntry[] = items.map((item: RssItem) => {
    const thumbnail = textOf(item.enclosure?.['@_url'])
    return {
      title: decodeEntities(textOf(item.title)),
      url: textOf(item.link),
      published_at: toIsoOrNull(textOf(item.pubDate)),
      thumbnail_url: thumbnail === '' ? null : thumbnail,
    }
  })

  return entries
}
