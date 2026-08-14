import { ItemForm } from '../item-form'
import { createItem } from '../actions'

export default async function NewItemPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">新しいアイテム</h1>
      <ItemForm action={createItem} />
    </main>
  )
}
