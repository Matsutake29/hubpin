import type { NormalizedEntry } from './types'

type WpPost = {
  title?: { rendered?: string }
  link?: string
  date?: string
  _embedded?: {
    'wp:featuredmedia'?: { source_url?: string }[]
  }
}

export async function fetchWordPress(
  endpoint: string,
  fallback: string,
  max: number,
): Promise<NormalizedEntry[]> {
  const url = `${endpoint}?per_page=${max}&_embed=wp:featuredmedia&_fields=title,link,date,_links,_embedded`
  const res = await fetch(url)
  const posts: WpPost[] = await res.json()

  const entries: NormalizedEntry[] = posts.slice(0, max).map((post: WpPost) => ({
    title: post.title?.rendered ?? '',
    url: post.link ?? '',
    published_at: post.date ?? null,
    thumbnail_url: post._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null,
  }))

  return entries
}
