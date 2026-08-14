import { notFound } from 'next/navigation'
import { createPublicClient } from '@/utils/supabase/public'
import { CardGrid } from './card-grid'

export async function generateStaticParams() {
  const supabase = createPublicClient()
  const { data } = await supabase.from('profiles').select('username')
  return (data ?? []).map((p) => ({ username: p.username }))
}

export const revalidate = 3600

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-16 sm:gap-16 sm:py-20">
      <header className="flex flex-col gap-2">
        {/* username は「機械が扱う文字列」なので mono。表示名より先に出さない */}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {profile.display_name ?? profile.username}
        </h1>
        <p className="font-mono text-sm text-muted">@{profile.username}</p>
        {profile.title && <p className="leading-7">{profile.title}</p>}
      </header>

      <main>
        <CardGrid items={items ?? []} />
      </main>
    </div>
  )
}
