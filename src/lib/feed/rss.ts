import type { NormalizedEntry } from './types'
import { XMLParser } from 'fast-xml-parser'
import { toIsoOrNull } from './date'

type RssFeed = {
  rss?: {
    channel?: {
      item?: RssItem | RssItem[]
    }
  }
}

type RssItem = {
  title?: string
  link?: string
  pubDate?: string
  enclosure?: { '@_url'?: string }
}

export function parseRss(xml: string): NormalizedEntry[] {
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml)
  const feed: RssFeed = parsed
  const raw = feed.rss?.channel?.item

  const items: RssItem[] = Array.isArray(raw) ? raw : raw ? [raw] : []

  const entries: NormalizedEntry[] = items.map((item: RssItem) => ({
    title: item.title ?? '',
    url: item.link ?? '',
    published_at: toIsoOrNull(item.pubDate),
    thumbnail_url: item.enclosure?.['@_url'] ?? null,
  }))

  return entries
}