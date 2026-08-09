import { notFound } from 'next/navigation'
import { createPublicClient } from '@/utils/supabase/public'

type Item = {
  type: 'link' | 'note' | 'feed'
  id: string
  title: string
  description: string | null
  url: string | null
  sort_order: number
}

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = createPublicClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, title')
    .eq('username', username)
    .maybeSingle()

  if (!profile) notFound()

  const { data: items } = await supabase
    .from('items')
    .select('id, type, title, description, url, sort_order')
    .eq('user_id', profile.id)
    .order('sort_order')

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">@{profile.username}</h1>
      <ul className="mt-6 space-y-3">
        {(items ?? []).map((item: Item) => (
          <li key={item.id} className="rounded-lg border p-4">
            {item.title}
          </li>
        ))}
      </ul>
    </main>
  )
}