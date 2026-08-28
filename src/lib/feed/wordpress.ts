import type { NormalizedEntry } from './types'
import { toIsoOrNull } from './date'
import { parseRss } from './rss'

type WpPost = {
  title?: { rendered?: string }
  link?: string
  date_gmt?: string
  _embedded?: {
    'wp:featuredmedia'?: { source_url?: string }[]
  }
}

export async function fetchWordPress(
  endpoint: string,
  fallback: string,
  max: number,
): Promise<NormalizedEntry[]> {
  const url = `${endpoint}?per_page=${max}&_embed=wp:featuredmedia&_fields=title,link,date_gmt,_links,_embedded`
  const res = await fetch(url)

  let entries: NormalizedEntry[]

  if (res.ok) {
    const posts: WpPost[] = await res.json()
    entries = posts.map((post: WpPost) => ({
      title: post.title?.rendered ?? '',
      url: post.link ?? '',
      // 🚨 date_gmt は UTC の値なのに Z が付かない。足さないと実行環境の TZ で解釈され、
      //    ローカル（JST）では正しく本番（UTC）でだけ9時間ずれる。
      published_at: toIsoOrNull(post.date_gmt ? `${post.date_gmt}Z` : undefined),
      thumbnail_url: post._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null,
    }))
  } else {
    const fallbackRes = await fetch(fallback)
    const xml = await fallbackRes.text()
    entries = parseRss(xml)
  }

  // 🚨 RSS は古い順で返る（08-28 実測）。取得経路によらず、切る前に並べ替える。
  //    ISO 8601 は辞書順＝時系列順なので文字列比較でよい（toIsoOrNull で揃えてある）。
  return [...entries]
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
    .slice(0, max)
}
