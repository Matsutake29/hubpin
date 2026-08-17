import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createPublicClient } from '@/utils/supabase/public'
import { CardGrid } from './card-grid'

export async function generateStaticParams() {
  const supabase = createPublicClient()
  const { data } = await supabase.from('profiles').select('username')
  return (data ?? []).map((p) => ({ username: p.username }))
}

export const revalidate = 3600

// generateMetadata と UserPage の両方から呼ぶので、1リクエスト内で1回に畳む。
// Next.js は fetch を自動で重複排除するが、Supabase クライアント経由の呼び出しは対象外
const getProfile = cache(async (username: string) => {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, display_name_en, title')
    .eq('username', username)
    .maybeSingle()
  return data
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfile(username)
  // 404 の判定は UserPage が持っている。ここは空を返して任せる
  if (!profile) return {}

  const name = profile.display_name ?? profile.username
  const title = profile.display_name_en ? `${name} / ${profile.display_name_en}` : name
  const description = profile.title
    ? `${profile.title}。${name}の発信をまとめたページ。`
    : `${name}の発信をまとめたページ。`
  const path = `/${profile.username}`

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
      title,
      description,
      siteName: 'Hubpin',
      locale: 'ja_JP',
      images: ['/og-default.png'],
    },
    // og:image が 1200×630 の横長なので large。summary にすると正方形に切られる
    twitter: { card: 'summary_large_image' },
  }
}

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const profile = await getProfile(username)

  if (!profile) notFound()

  const supabase = createPublicClient()

  const { data: items } = await supabase
    .from('items')
    .select('id, type, title, description, url, sort_order')
    .eq('user_id', profile.id)
    // RLS（to anon using (visible = true)）でも絞られるが、ここでも絞る。
    // 2026-08-10 に PERMISSIVE の OR 結合で非公開カードが漏れた場所で、
    // ポリシーを1本触るだけで再発する。dashboard 側は本人しか見ないので RLS に任せる。
    .eq('visible', true)
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
