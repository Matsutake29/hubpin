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
  // 🚨 hasAttribute は使わない。aria-disabled は false のときも属性自体は出るので、
  //    hasAttribute だと「無効かどうか」ではなく「属性があるか」しか見ていないことになり、
  //    全件 true で通ってしまう。値を読んで 'true' / 'false' を比べる
  test('先頭の「上へ移動」だけが無効になる', () => {
    render(<ItemList items={items} />)

    const ups = screen.getAllByRole('button', { name: '上へ移動' })

    expect(ups[0].getAttribute('aria-disabled')).toBe('true')
    expect(ups[1].getAttribute('aria-disabled')).toBe('false')
    expect(ups[2].getAttribute('aria-disabled')).toBe('false')
  })

  test('末尾の「下へ移動」だけが無効になる', () => {
    render(<ItemList items={items} />)

    const downs = screen.getAllByRole('button', { name: '下へ移動' })

    expect(downs[0].getAttribute('aria-disabled')).toBe('false')
    expect(downs[1].getAttribute('aria-disabled')).toBe('false')
    expect(downs[2].getAttribute('aria-disabled')).toBe('true')
  })

  test('カードが1枚のときは上も下も無効になる', () => {
    render(<ItemList items={[items[0]]} />)

    expect(screen.getByRole('button', { name: '上へ移動' }).getAttribute('aria-disabled')).toBe(
      'true',
    )
    expect(screen.getByRole('button', { name: '下へ移動' }).getAttribute('aria-disabled')).toBe(
      'true',
    )
  })

  // ⭐ これが 2026-08-21 の修正の本体。disabled な要素はブラウザ仕様でフォーカスを
  //    保持できないため、「上へ」を押して1番目に着いた瞬間に disabled になって
  //    フォーカスが消えていた。aria-disabled なら要素は生きたままなので消えない。
  //    🚨 属性名を戻すと同じ不具合が再発するので、無効な側にこそ disabled が
  //    「付いていないこと」を固定する
  test('無効なボタンでも disabled 属性は付けない（フォーカスを保持するため）', () => {
    render(<ItemList items={[items[0]]} />)

    const up = screen.getByRole('button', { name: '上へ移動' })
    const down = screen.getByRole('button', { name: '下へ移動' })

    expect(up.getAttribute('aria-disabled')).toBe('true')
    expect(up.hasAttribute('disabled')).toBe(false)
    expect(down.hasAttribute('disabled')).toBe(false)
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
