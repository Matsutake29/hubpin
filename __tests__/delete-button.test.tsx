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

  // #51-4 押したボタンが置き換わってもフォーカスを body に落とさない
  test('確認に入ると「やめる」に、戻ると「削除」にフォーカスが移る', () => {
    render(<DeleteButton action={vi.fn()} />)

    fireEvent.click(screen.getByText('削除'))
    expect(document.activeElement).toBe(screen.getByText('やめる'))

    fireEvent.click(screen.getByText('やめる'))
    expect(document.activeElement).toBe(screen.getByText('削除'))
  })

  test('最初の表示ではフォーカスを動かさない', () => {
    render(<DeleteButton action={vi.fn()} />)

    expect(document.activeElement).toBe(document.body)
  })
})
