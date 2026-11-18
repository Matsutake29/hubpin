import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FetchStatus } from '@/app/dashboard/fetch-status'

describe('FetchStatus（#47-9）', () => {
  test('一度も取得していないソースを「成功」と出さない', () => {
    render(
      <FetchStatus
        sources={[{ id: '1', provider: 'zenn', last_fetched_at: null, last_status: null }]}
      />,
    )

    expect(screen.queryByText('成功')).toBeNull()
    // 日付の欄と状態の欄が両方「未取得」になる
    expect(screen.getAllByText('未取得')).toHaveLength(2)
  })

  test('success は成功、failure は失敗と出す', () => {
    render(
      <FetchStatus
        sources={[
          {
            id: '1',
            provider: 'zenn',
            last_fetched_at: '2026-11-18T00:00:00Z',
            last_status: 'success',
          },
          {
            id: '2',
            provider: 'github',
            last_fetched_at: '2026-11-18T00:00:00Z',
            last_status: 'failure',
          },
        ]}
      />,
    )

    expect(screen.getByText('成功')).toBeTruthy()
    expect(screen.getByText('失敗')).toBeTruthy()
  })
})
