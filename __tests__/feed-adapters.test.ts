import { afterEach, describe, expect, test, vi } from 'vitest'
import { fetchWordPress } from '@/lib/feed/wordpress'
import { fetchZenn } from '@/lib/feed/zenn'
import { fetchGitHub } from '@/lib/feed/github'
import { fetchEntries } from '@/lib/feed'

afterEach(() => {
  vi.unstubAllGlobals()
})

const wpPost = {
  title: { rendered: 'テスト記事' },
  link: 'https://example.com/post',
  date_gmt: '2026-08-19T10:00:00',
  _embedded: { 'wp:featuredmedia': [{ source_url: 'https://example.com/img.png' }] },
}

describe('fetchWordPress', () => {
  test('res.ok のとき title / url / thumbnail が正規化される', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [wpPost],
      }),
    )

    const entries = await fetchWordPress('https://example.com/wp-json/wp/v2/posts', null, 3)

    expect(entries).toHaveLength(1)
    expect(entries[0].title).toBe('テスト記事')
    expect(entries[0].url).toBe('https://example.com/post')
    expect(entries[0].thumbnail_url).toBe('https://example.com/img.png')
  })

  test('date_gmt に Z を足して UTC として解釈される', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [wpPost],
      }),
    )

    const entries = await fetchWordPress('https://example.com/wp-json/wp/v2/posts', null, 3)

    expect(entries[0].published_at).toBe('2026-08-19T10:00:00.000Z')
  })

  test('title.rendered が無くても throw せず空文字になる', async () => {
    const wpPostWithoutTitle = { ...wpPost, title: {} }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [wpPostWithoutTitle],
      }),
    )

    const entries = await fetchWordPress('https://example.com/wp-json/wp/v2/posts', null, 3)

    expect(entries[0].title).toBe('')
  })

  test('REST が 500 で fallback が null なら throw する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    )

    await expect(
      fetchWordPress('https://example.com/wp-json/wp/v2/posts', null, 3),
    ).rejects.toThrow('フォールバック先も無い')
  })

  test('REST が 500・フォールバックも 404 なら throw する', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          // 🚨 ok 判定を消したときに parseRss へ流れる 404 ページを再現する。
          text: async () => '<html><body>404 Not Found</body></html>',
        }),
    )

    await expect(
      fetchWordPress('https://example.com/wp-json/wp/v2/posts', 'https://example.com/fallback', 3),
    ).rejects.toThrow('フォールバックも失敗')
  })

  test('REST が 500 でもフォールバックが 200 なら RSS が返る', async () => {
    const fallbackXml =
      '<rss><channel><item><title>フォールバックの記事</title><link>https://example.com/fallback-post</link><pubDate>Wed, 19 Aug 2026 10:00:00 +0000</pubDate></item></channel></rss>'

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => fallbackXml,
      })
    vi.stubGlobal('fetch', fetchMock)

    const entries = await fetchWordPress(
      'https://example.com/wp-json/wp/v2/posts',
      'https://example.com/fallback',
      3,
    )

    expect(entries).toHaveLength(1)
    expect(entries[0].title).toBe('フォールバックの記事')
    expect(entries[0].url).toBe('https://example.com/fallback-post')
    expect(entries[0].thumbnail_url).toBe(null)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('fetchZenn', () => {
  const zennXml =
    '<rss><channel><item><title>Zenn の記事</title><link>https://zenn.dev/example/articles/abc</link><pubDate>Wed, 19 Aug 2026 10:00:00 +0000</pubDate></item></channel></rss>'

  test('res.ok が false なら throw する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        // 🚨 ok 判定を消したときに parseRss へ流れるものを再現する。
        //    これが無いと text is not a function で落ち、「throw しなくなった」を検証できない。
        text: async () => '<html><body>500 Internal Server Error</body></html>',
      }),
    )

    await expect(fetchZenn('https://zenn.dev/example/feed')).rejects.toThrow('Zenn の RSS が')
  })

  test('200 なら RSS がパースされる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => zennXml,
      }),
    )

    const entries = await fetchZenn('https://zenn.dev/example/feed')

    expect(entries).toHaveLength(1)
    expect(entries[0].title).toBe('Zenn の記事')
    expect(entries[0].url).toBe('https://zenn.dev/example/articles/abc')
    expect(entries[0].published_at).toBe('2026-08-19T10:00:00.000Z')
  })
})

const ghRepo = {
  name: 'hubpin',
  html_url: 'https://github.com/example/hubpin',
  pushed_at: '2026-09-01T08:51:00Z',
}

describe('fetchGitHub', () => {
  test('URL に sort=pushed が入る', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [ghRepo],
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchGitHub('https://api.github.com/users/example/repos', 3)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('sort=pushed'),
      expect.anything(),
    )
  })

  test('User-Agent: hubpin を送る', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [ghRepo],
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchGitHub('https://api.github.com/users/example/repos', 3)

    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), {
      headers: { 'User-Agent': 'hubpin' },
    })
  })

  test('403 / 429 なら throw する', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 403 })
        .mockResolvedValueOnce({ ok: false, status: 429 }),
    )

    const endpoint = 'https://api.github.com/users/example/repos'

    await expect(fetchGitHub(endpoint, 3)).rejects.toThrow('GitHub API が 403')
    await expect(fetchGitHub(endpoint, 3)).rejects.toThrow('GitHub API が 429')
  })

  test('pushed_at が無いと published_at が null になる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { name: 'empty-repo', html_url: 'https://github.com/example/empty-repo' },
        ],
      }),
    )

    const entries = await fetchGitHub('https://api.github.com/users/example/repos', 3)

    expect(entries[0].published_at).toBe(null)
    expect(entries[0].title).toBe('empty-repo')
  })
})

describe('fetchEntries', () => {
  test('未知の provider なら throw する', async () => {
    await expect(
      fetchEntries({
        provider: 'note',
        endpoint_url: 'https://note.com/example/rss',
        fallback_url: null,
        max_entries: 3,
      }),
    ).rejects.toThrow('不明な provider')
  })

  test('max_entries で切られ、新しい順で返る', async () => {
    const fourItems =
      '<rss><channel>' +
      '<item><title>2番目</title><link>https://example.com/2</link><pubDate>Sun, 30 Aug 2026 00:00:00 +0000</pubDate></item>' +
      '<item><title>4番目</title><link>https://example.com/4</link><pubDate>Fri, 28 Aug 2026 00:00:00 +0000</pubDate></item>' +
      '<item><title>1番目</title><link>https://example.com/1</link><pubDate>Mon, 31 Aug 2026 00:00:00 +0000</pubDate></item>' +
      '<item><title>3番目</title><link>https://example.com/3</link><pubDate>Sat, 29 Aug 2026 00:00:00 +0000</pubDate></item>' +
      '</channel></rss>'

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => fourItems,
      }),
    )

    const entries = await fetchEntries({
      provider: 'zenn',
      endpoint_url: 'https://zenn.dev/example/feed',
      fallback_url: null,
      max_entries: 3,
    })

    expect(entries.map((e) => e.title)).toEqual(['1番目', '2番目', '3番目'])
  })

  test('provider が wordpress なら GitHub の URL を叩かない', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [wpPost],
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchEntries({
      provider: 'wordpress',
      endpoint_url: 'https://example.com/wp-json/wp/v2/posts',
      fallback_url: null,
      max_entries: 3,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/wp-json/wp/v2/posts'))
  })
})
