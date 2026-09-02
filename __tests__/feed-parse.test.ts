import { describe, expect, test } from 'vitest'
import { parseRss } from '@/lib/feed/rss'
import { toIsoOrNull } from '@/lib/feed/date'
import { sortAndTake } from '@/lib/feed'
import type { NormalizedEntry } from '@/lib/feed/types'

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

// テストで意味があるのは title と published_at だけ。残り2つは固定値に潰す。
const entry = (title: string, published_at: string | null): NormalizedEntry => ({
  title,
  url: 'https://example.com/',
  published_at,
  thumbnail_url: null,
})

describe('sortAndTake', () => {
  test('古い順で渡すと新しい順で返る', () => {
    const input = [
      entry('古', '2026-08-11T00:00:00.000Z'),
      entry('中', '2026-08-20T00:00:00.000Z'),
      entry('新', '2026-08-31T00:00:00.000Z'),
    ]

    expect(sortAndTake(input, 3).map((e) => e.title)).toEqual(['新', '中', '古'])
  })

  // 🚨 ここから2本は endpoint_url を壊す手では暴けない。
  //    WP の RSS は日付が全部生きているので、null の行が1件も出てこないため。
  test('published_at が null の行は末尾に来る', () => {
    const input = [
      entry('古', '2026-08-11T00:00:00.000Z'),
      entry('null', null),
      entry('新', '2026-08-31T00:00:00.000Z'),
    ]

    expect(sortAndTake(input, 3).map((e) => e.title)).toEqual(['新', '古', 'null'])
  })

  test('max で切るとき、日付が生きている行が優先される', () => {
    const input = [
      entry('古', '2026-08-11T00:00:00.000Z'),
      entry('null', null),
      entry('新', '2026-08-31T00:00:00.000Z'),
      entry('中', '2026-08-20T00:00:00.000Z'),
    ]

    expect(sortAndTake(input, 3).map((e) => e.title)).toEqual(['新', '中', '古'])
  })

  // ⚠️ sort は破壊的メソッド。[...entries] のコピーを外すと、呼び出し元の配列が並べ替わる。
  test('渡した配列を書き換えない', () => {
    const input = [entry('古', '2026-08-11T00:00:00.000Z'), entry('新', '2026-08-31T00:00:00.000Z')]

    sortAndTake(input, 2)

    expect(input.map((e) => e.title)).toEqual(['古', '新'])
  })
})
