import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import type { ItemInput } from '@/lib/schemas/item'
import { ItemForm } from '../item-form'
import { updateItem } from '../actions'

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('items')
    .select('title, type, url, description, visible')
    .eq('id', id)
    .maybeSingle()

  if (error) console.error(error)
  if (!item) notFound()

  return (
    // 外枠と余白は dashboard/layout.tsx が持つ。ここは幅だけ絞る（new/page.tsx と同じ）
    <main className="flex max-w-xl flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight">カードを編集</h1>
      <ItemForm
        action={updateItem.bind(null, id)}
        defaultItem={{
          ...item,
          type: item.type as ItemInput['type'],
          url: item.url ?? '',
          description: item.description ?? '',
        }}
      />
    </main>
  )
}
