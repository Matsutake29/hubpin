import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DeleteButton } from '@/app/dashboard/delete-button'
import { AnnouncerProvider } from '@/app/dashboard/announcer'

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

  test('「削除する」で action が呼ばれる', () => {
    const action = vi.fn()
    render(<DeleteButton action={action} />)

    fireEvent.click(screen.getByText('削除'))
    fireEvent.click(screen.getByText('削除する'))

    expect(action).toHaveBeenCalledTimes(1)
  })

  test('「削除」を押しただけでは action は呼ばれない', () => {
    const action = vi.fn()
    render(<DeleteButton action={action} />)

    fireEvent.click(screen.getByText('削除'))

    expect(action).not.toHaveBeenCalled()
  })

  // #51-10 消した行と一緒にメッセージが消えないよう、一覧の外のライブリージョンに書く
  test('削除すると、外側のライブリージョンに結果が出る', async () => {
    render(
      <AnnouncerProvider>
        <DeleteButton action={vi.fn().mockResolvedValue(undefined)} label="あ" />
      </AnnouncerProvider>,
    )

    fireEvent.click(screen.getByText('削除', { exact: false }))
    fireEvent.click(screen.getByText('削除する', { exact: false }))

    expect(await screen.findByText('「あ」を削除しました')).toBeTruthy()
  })
})
