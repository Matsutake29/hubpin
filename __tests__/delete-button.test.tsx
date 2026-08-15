import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DeleteButton } from '@/app/dashboard/delete-button'

describe('DeleteButton', () => {
  test('最初は「削除」だけが出ている', () => {
    render(<DeleteButton action={vi.fn()} />)

    expect(screen.getByText('削除')).toBeDefined()
    expect(screen.queryByText('削除する')).toBeNull()
  })

  test('押すと2段階目が出る', () => {
    render(<DeleteButton action={vi.fn()} />)

    fireEvent.click(screen.getByText('削除'))

    expect(screen.getByText('やめる')).toBeDefined()
    expect(screen.getByText('削除する')).toBeDefined()
    expect(screen.queryByText('削除')).toBeNull()
  })

  test('「やめる」で戻る', () => {
    render(<DeleteButton action={vi.fn()} />)

    fireEvent.click(screen.getByText('削除'))
    fireEvent.click(screen.getByText('やめる'))

    expect(screen.getByText('削除')).toBeDefined()
    expect(screen.queryByText('削除する')).toBeNull()
  })
})
