import { beforeEach, describe, expect, test, vi } from 'vitest'

// 書き込みの経路が「ダッシュボードと公開ページの両方を再検証する」ことを固定する（#53）。
// 🚨 actions.ts には他にテストが無く、前置き・後置きを切り出したときの書き違いを捕まえる場所が無かった。
const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidatePublicPage: vi.fn(),
  getClaims: vi.fn(),
  maybeSingle: vi.fn(),
  insert: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/revalidate', () => ({ revalidatePublicPage: mocks.revalidatePublicPage }))
vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getClaims: mocks.getClaims },
    from: () => ({
      delete: () => ({ eq: () => ({ select: () => ({ maybeSingle: mocks.maybeSingle }) }) }),
      select: () => ({ order: () => ({ limit: () => ({ maybeSingle: mocks.maybeSingle }) }) }),
      insert: mocks.insert,
    }),
  }),
}))

import { createItem, deleteItem } from '@/app/dashboard/actions'

beforeEach(() => {
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'u1' } } })
  mocks.maybeSingle.mockResolvedValue({ data: { id: 'i1', sort_order: 3 }, error: null })
  mocks.insert.mockResolvedValue({ error: null })
})

function form(values: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) fd.set(k, v)
  return fd
}

describe('書き込みのあとの再検証', () => {
  test('削除するとダッシュボードと持ち主の公開ページを再検証する', async () => {
    await deleteItem('i1')

    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mocks.revalidatePublicPage).toHaveBeenCalledWith(expect.anything(), 'u1')
  })

  test('ログインしていなければ何もしない', async () => {
    mocks.getClaims.mockResolvedValue({ data: null })

    await deleteItem('i1')

    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  test('追加では空の説明を null にして保存する（正規化は prepareItem の1か所）', async () => {
    await createItem(undefined, form({ title: 'A', type: 'link', url: 'https://example.com/' }))

    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ description: null, user_id: 'u1', sort_order: 4 }),
    )
    expect(mocks.revalidatePublicPage).toHaveBeenCalledWith(expect.anything(), 'u1')
  })

  test('想定外の type は検証で落とし、画面へは link として返す', async () => {
    const state = await createItem(undefined, form({ title: 'A', type: 'foo', url: '' }))

    expect(state?.errors?.type).toBeDefined()
    expect(state?.values?.type).toBe('link')
    expect(mocks.insert).not.toHaveBeenCalled()
  })
})
