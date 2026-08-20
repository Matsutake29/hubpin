import { ItemForm } from '../item-form'
import { createItem } from '../actions'

export default async function NewItemPage() {
  return (
    // 外枠と余白は dashboard/layout.tsx が持つ。ここは幅だけ絞る
    // （入力欄が一覧と同じ 4xl まで伸びると、目が横に流れて読みにくい）
    <main className="flex max-w-xl flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight">新しいカード</h1>
      <ItemForm action={createItem} />
    </main>
  )
}
