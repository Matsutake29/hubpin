import type { NormalizedEntry } from './types'
import { toIsoOrNull } from './date'
import { parseRss } from './rss'
import { decodeEntities } from './entities'
import { feedFetchSignal, withParams } from './http'

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
  const url = withParams(endpoint, {
    per_page: String(max),
    _embed: 'wp:featuredmedia',
    _fields: 'title,link,date_gmt,_links,_embedded',
  })
  const res = await fetch(url, { signal: feedFetchSignal() })

  let entries: NormalizedEntry[]

  if (res.ok) {
    // 🚨 res.json() は any。型注釈は検査ではないので unknown で受けて配列か確かめる。
    //    確かめないと、オブジェクトが返ったとき `posts.map is not a function` という
    //    原因から遠いエラーが fetch_logs に残る。
    const json: unknown = await res.json()
    if (!Array.isArray(json)) {
      throw new Error('WP REST が配列を返さなかった')
    }
    const posts: WpPost[] = json
    entries = posts.map((post: WpPost) => ({
      title: decodeEntities(post.title?.rendered ?? ''),
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

    const fallbackRes = await fetch(fallback, { signal: feedFetchSignal() })
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
