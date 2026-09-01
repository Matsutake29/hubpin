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
  fallback: string | null,
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
    // 🚨 フォールバック先が無い媒体もある（GitHub には RSS が無い）。
    //    null は「設定漏れ」ではなく「そういう媒体」。取得失敗として投げる。
    if (!fallback) {
      throw new Error(`WP REST が ${res.status} で、フォールバック先も無い`)
    }

    const fallbackRes = await fetch(fallback)
    // 🚨 ok を見ないと、404 の HTML をパースして空配列になる。
    //    空配列は「取得成功・0件」として保存側に渡り、既存のエントリーを全部消す。
    if (!fallbackRes.ok) {
      throw new Error(`フォールバックも失敗: ${fallbackRes.status}`)
    }

    const xml = await fallbackRes.text()
    entries = parseRss(xml)
  }

  return entries
}
