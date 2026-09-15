import { beforeEach, describe, expect, test, vi } from 'vitest'

// 🚨 vi.mock はファイルの先頭へ巻き上げられるので、factory から外側の変数は見えない。
//    vi.hoisted で一緒に巻き上げると参照できる。
const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  order: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('@/utils/supabase/public', () => ({
  createPublicClient: () => ({
    from: (table: string) =>
      table === 'profiles'
        ? { select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }
        : { select: () => ({ eq: () => ({ eq: () => ({ order: mocks.order }) }) }) },
  }),
}))

import UserPage from '@/app/[username]/page'

const params = Promise.resolve({ username: 'guest' })
const profile = {
  id: 'u1',
  username: 'guest',
  display_name: null,
  display_name_en: null,
  title: null,
}
// Supabase が 504 を返したときも、supabase-js は throw せず error に入れて返す（#61）
const dbError = { message: 'upstream timeout', details: '', hint: '', code: '' }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.order.mockResolvedValue({ data: [], error: null })
})

describe('公開ページ /[username]', () => {
  test('profiles が読めなかったら throw する（404 にしない）', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: dbError })

    await expect(UserPage({ params })).rejects.toThrow('profiles の読み取りに失敗')
    expect(mocks.notFound).not.toHaveBeenCalled()
  })

  test('profiles に行が無ければ notFound になる', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })

    await expect(UserPage({ params })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mocks.notFound).toHaveBeenCalledTimes(1)
  })

  test('items が読めなかったら throw する（カード0枚のページにしない）', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: profile, error: null })
    mocks.order.mockResolvedValue({ data: null, error: dbError })

    await expect(UserPage({ params })).rejects.toThrow('items の読み取りに失敗')
  })
})
