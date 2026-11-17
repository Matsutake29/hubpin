import { describe, expect, test, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const mocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import { revalidatePublicPage } from '@/lib/revalidate'

// profiles の読み取り結果だけを差し替えられる偽のクライアント
function fakeClient(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result)
  const client = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }
  return client as unknown as SupabaseClient<Database>
}

// 🚨 feeds-refresh 側のテストは @/lib/revalidate を丸ごと差し替えているので、
//    この関数の中身にはそこから永久に届かない。ここで直接確かめる（#49）。
describe('revalidatePublicPage', () => {
  test('username のページを再検証する', async () => {
    await revalidatePublicPage(fakeClient({ data: { username: 'guest' }, error: null }), 'u1')

    expect(mocks.revalidatePath).toHaveBeenCalledWith('/guest')
  })

  test('profiles が読めなければ再検証せず、エラーを出す', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await revalidatePublicPage(
      fakeClient({ data: null, error: { message: 'permission denied' } }),
      'u1',
    )

    expect(mocks.revalidatePath).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('profiles の読み取りに失敗'),
      'permission denied',
    )
    consoleError.mockRestore()
  })

  test('profile が無ければ再検証しない', async () => {
    await revalidatePublicPage(fakeClient({ data: null, error: null }), 'u1')

    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})
