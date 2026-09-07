import { afterEach, describe, expect, test, vi } from 'vitest'

// 🚨 route.ts → service.ts → env.ts と import が連鎖し、env.ts はモジュールの読み込み時に
//    NEXT_PUBLIC_SUPABASE_URL を検証する（env.ts:27-28）。Vitest は .env.local を
//    process.env に載せないので、ここで差し替えないと import しただけで落ちる。
vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: async () => ({ data: [], error: null }),
      }),
    }),
  }),
}))

import { GET } from '@/app/api/feeds/refresh/route'

const url = 'http://localhost/api/feeds/refresh'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('GET /api/feeds/refresh の認証', () => {
  test('CRON_SECRET が未設定なら Bearer undefined でも 401', async () => {
    vi.stubEnv('CRON_SECRET', undefined)

    const res = await GET(new Request(url, { headers: { authorization: 'Bearer undefined' } }))

    expect(res.status).toBe(401)
  })

  test('CRON_SECRET と違うヘッダなら 401', async () => {
    vi.stubEnv('CRON_SECRET', 'correct-secret')

    const res = await GET(new Request(url, { headers: { authorization: 'Bearer wrong-secret' } }))

    expect(res.status).toBe(401)
  })

  test('CRON_SECRET と一致すれば 401 にならない', async () => {
    vi.stubEnv('CRON_SECRET', 'correct-secret')

    const res = await GET(new Request(url, { headers: { authorization: 'Bearer correct-secret' } }))

    expect(res.status).toBe(200)
  })
})
