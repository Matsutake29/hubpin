import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import type { ItemInput } from '@/lib/schemas/item'
import { EditItemForm } from './item-form'

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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
    <EditItemForm
      id={id}
      item={{
        ...item,
        // 3値の保証は DB の CHECK と Zod にあるが、生成型には出ない。
        // 書き戻すときは updateItem の itemSchema が検証するので、ここが外れても DB は守られる
        type: item.type as ItemInput['type'],
        url: item.url ?? '',
        description: item.description ?? '',
      }}
    />
  )
}
