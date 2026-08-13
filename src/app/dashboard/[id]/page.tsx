import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import type { ItemInput } from '@/lib/schemas/item'
import { ItemForm } from '../item-form'
import { updateItem } from '../actions'

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
    <ItemForm
      action={updateItem.bind(null, id)}
      defaultItem={{ ...item, type: item.type as ItemInput['type'], url: item.url ?? '',
      description: item.description ?? '' }}
    />
  )
}
