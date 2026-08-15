import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ItemList } from '@/app/dashboard/item-list'

// 🚨 actions.ts は Supabase クライアント経由で next/headers まで届く。
//    next/headers はリクエストの中でしか動かないので、importした時点でテストが起動できない。
//    UI だけを見たいので、Server Action は丸ごと偽物に差し替える
vi.mock('@/app/dashboard/actions', () => ({
  moveItem: vi.fn(),
  toggleVisible: vi.fn(),
  deleteItem: vi.fn(),
}))

const items = [
  { id: '1', title: 'あ', type: 'link', visible: true, sort_order: 1 },
  { id: '2', title: 'い', type: 'note', visible: false, sort_order: 2 },
  { id: '3', title: 'う', type: 'feed', visible: true, sort_order: 3 },
]

describe('ItemList', () => {
  test('先頭の「上へ移動」だけが押せない', () => {
    render(<ItemList items={items} />)

    const ups = screen.getAllByRole('button', { name: '上へ移動' })

    expect(ups[0].hasAttribute('disabled')).toBe(true)
    expect(ups[1].hasAttribute('disabled')).toBe(false)
    expect(ups[2].hasAttribute('disabled')).toBe(false)
  })

  test('末尾の「下へ移動」だけが押せない', () => {
    render(<ItemList items={items} />)

    const downs = screen.getAllByRole('button', { name: '下へ移動' })

    expect(downs[0].hasAttribute('disabled')).toBe(false)
    expect(downs[1].hasAttribute('disabled')).toBe(false)
    expect(downs[2].hasAttribute('disabled')).toBe(true)
  })

  test('カードが1枚のときは上も下も押せない', () => {
    render(<ItemList items={[items[0]]} />)

    expect(screen.getByRole('button', { name: '上へ移動' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: '下へ移動' }).hasAttribute('disabled')).toBe(true)
  })

  test('カードが0枚のときは空状態が出る', () => {
    render(<ItemList items={[]} />)

    expect(screen.getByText('まだカードがありません')).toBeDefined()
    expect(screen.queryByRole('button', { name: '上へ移動' })).toBeNull()
  })

  // 🚨 vi.mock はパスがずれても黙って何もしない。しかも actions.ts を本物のまま
  //    読み込んでも、bind するだけで呼ばないのでテストは緑のまま通ってしまう
  //    （next/headers は import では落ちず、cookies() を呼んだときだけ落ちる）。
  //    差し替えが効いていること自体をここで確かめる
  test('Server Action がモックに差し替わっている', async () => {
    const { moveItem } = await import('@/app/dashboard/actions')

    expect(vi.isMockFunction(moveItem)).toBe(true)
  })
})
