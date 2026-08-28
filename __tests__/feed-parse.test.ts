import { describe, expect, test } from 'vitest'
import { parseRss } from '@/lib/feed/rss'
import { toIsoOrNull } from '@/lib/feed/date'

const oneItemXml =
  '<rss><channel><item><title>1件だけ</title><link>https://example.com/</link><pubDate>Wed, 19 Aug 2026 10:00:00 +0000</pubDate></item></channel></rss>'

describe('toIsoOrNull', () => {
  test('RFC822 を ISO に変換する', () => {
    expect(toIsoOrNull('Wed, 19 Aug 2026 10:00:00 +0000')).toBe('2026-08-19T10:00:00.000Z')
  })

  test('無効な日付は null を返す', () => {
    expect(toIsoOrNull('こわれた')).toBe(null)
  })
})

describe('parseRss', () => {
  test('item が1件でも配列を返す', () => {
    expect(parseRss(oneItemXml)).toHaveLength(1)
  })

  test('pubDate を ISO に変換する', () => {
    expect(parseRss(oneItemXml)[0].published_at).toBe('2026-08-19T10:00:00.000Z')
  })
})