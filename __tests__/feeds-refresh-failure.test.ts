import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// 🚨 vi.mock はファイルの先頭へ巻き上げられるので、factory から外側の変数は見えない。
//    vi.hoisted で一緒に巻き上げると参照できる。
const mocks = vi.hoisted(() => ({
  fetchEntries: vi.fn(),
  revalidatePublicPage: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  insertInto: vi.fn(),
  selectEq: vi.fn(),
  rpc: vi.fn(),
  insert: vi.fn(),
  updateEq: vi.fn(),
}))

vi.mock('@/lib/feed', () => ({ fetchEntries: mocks.fetchEntries }))
vi.mock('@/lib/revalidate', () => ({ revalidatePublicPage: mocks.revalidatePublicPage }))
vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: () => ({
    // 🚨 引数を捨てない。捨てると「どのテーブルに」「どの列で絞って」を壊しても緑のまま通る（#49）。
    from: (table: string) => {
      mocks.from(table)
      return {
        select: (columns: string) => {
          mocks.select(table, columns)
          return { eq: mocks.selectEq }
        },
        insert: (row: unknown) => {
          mocks.insertInto(table)
          return mocks.insert(row)
        },
        update: () => ({ eq: mocks.updateEq }),
      }
    },
    rpc: mocks.rpc,
  }),
}))

import { GET } from '@/app/api/feeds/refresh/route'

const url = 'http://localhost/api/feeds/refresh'
const authorized = () => new Request(url, { headers: { authorization: 'Bearer test-secret' } })

// s1 と s2 は同じ持ち主（u1）。1人が複数媒体を持つ形を再現して revalidate の回数を見る。
const sources = [
  {
    id: 's1',
    provider: 'wordpress',
    endpoint_url: 'https://a.example/wp',
    fallback_url: null,
    max_entries: 3,
    user_id: 'u1',
  },
  {
    id: 's2',
    provider: 'zenn',
    endpoint_url: 'https://b.example/feed',
    fallback_url: null,
    max_entries: 3,
    user_id: 'u1',
  },
  {
    id: 's3',
    provider: 'github',
    endpoint_url: 'https://c.example/repos',
    fallback_url: null,
    max_entries: 3,
    user_id: 'u2',
  },
]

const entry = {
  title: 'テスト記事',
  url: 'https://example.com/1',
  published_at: null,
  thumbnail_url: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', 'test-secret')
  mocks.selectEq.mockResolvedValue({ data: sources, error: null })
  mocks.rpc.mockResolvedValue({ data: 1, error: null })
  mocks.insert.mockResolvedValue({ error: null })
  mocks.updateEq.mockResolvedValue({ error: null })
  mocks.fetchEntries.mockResolvedValue([entry])
  mocks.revalidatePublicPage.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/feeds/refresh の障害設計', () => {
  test('取得が0件なら replace_feed_entries を呼ばない', async () => {
    mocks.fetchEntries.mockResolvedValue([])

    await GET(authorized())

    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  test('1媒体が失敗しても残りの媒体は保存される', async () => {
    mocks.fetchEntries.mockRejectedValueOnce(new Error('WP REST が 500')).mockResolvedValue([entry])

    await GET(authorized())

    expect(mocks.rpc).toHaveBeenCalledTimes(2)
    expect(mocks.rpc.mock.calls.map((call) => call[1].p_source_id)).toEqual(['s2', 's3'])
  })

  test('失敗したソースは fetch_logs に failure で記録される', async () => {
    mocks.fetchEntries.mockRejectedValueOnce(new Error('WP REST が 500')).mockResolvedValue([entry])

    await GET(authorized())

    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ source_id: 's1', status: 'failure' }),
    )
  })

  test('失敗したソースの持ち主は revalidate されない', async () => {
    mocks.fetchEntries
      .mockResolvedValueOnce([entry])
      .mockResolvedValueOnce([entry])
      .mockRejectedValueOnce(new Error('GitHub API が 403'))

    await GET(authorized())

    expect(mocks.revalidatePublicPage).toHaveBeenCalledTimes(1)
    expect(mocks.revalidatePublicPage).toHaveBeenCalledWith(expect.anything(), 'u1')
  })

  test('RPC が error を返したら failure になる', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'permission denied for table' },
    })

    await GET(authorized())

    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        source_id: 's1',
        status: 'failure',
        error_message: expect.stringContaining('permission denied for table'),
      }),
    )
  })

  test('有効なソースだけを、持ち主の id ごと読む', async () => {
    await GET(authorized())

    expect(mocks.selectEq).toHaveBeenCalledWith('enabled', true)
    expect(mocks.select).toHaveBeenCalledWith('feed_sources', expect.stringContaining('user_id'))
  })

  test('保存は replace_feed_entries、ログは fetch_logs に書く', async () => {
    await GET(authorized())

    expect(mocks.rpc).toHaveBeenCalledWith('replace_feed_entries', expect.anything())
    expect(mocks.insertInto).toHaveBeenCalledWith('fetch_logs')
    expect(mocks.insertInto).not.toHaveBeenCalledWith('feed_sources')
  })

  test('ログの書き込みが失敗しても、保存できたソースは success のまま再検証される', async () => {
    mocks.insert.mockResolvedValue({ error: { message: 'permission denied' } })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await GET(authorized())

    expect(await res.json()).toEqual([
      { provider: 'wordpress', saved: 1 },
      { provider: 'zenn', saved: 1 },
      { provider: 'github', saved: 1 },
    ])
    expect(mocks.revalidatePublicPage).toHaveBeenCalledTimes(2)
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  test('ソースの一覧が読めなければ 500 を返し、取得に入らない', async () => {
    mocks.selectEq.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const res = await GET(authorized())

    expect(res.status).toBe(500)
    expect(mocks.fetchEntries).not.toHaveBeenCalled()
  })
})
