import type { NormalizedEntry } from './types'
import { toIsoOrNull } from './date'

type GhRepo = {
  name?: string
  html_url?: string
  pushed_at?: string
}

export async function fetchGitHub(endpoint: string, max: number): Promise<NormalizedEntry[]> {
  // 🚨 sort は pushed。updated ではない。updated_at は push では動かないことがある
  //    （2026-09-01 実測: hubpin は pushed 09-01 08:51 なのに updated 08-21 02:09 で、
  //      sort=updated だと9件中3番目に落ちる）。
  //    ⚠️ per_page でここが切るので、並べ替えのキーが published_at と違うと
  //       「取ってくる集合」自体がずれる。出口の sortAndTake では直せない
  //       —— 届かなかったリポジトリは並べようがない。
  const url = `${endpoint}?sort=pushed&per_page=${max}`

  // 🚨 User-Agent が空だと 403 を返す（GitHub の明示的な要件）。
  //    fetch の既定値 "node" でも通ってしまうが、名乗るほうを選ぶ。
  const res = await fetch(url, { headers: { 'User-Agent': 'hubpin' } })

  // 🚨 未認証は 60 req/h、しかも送信元 IP 単位で数えられる。Vercel の Functions は
  //    共有 IP から出るので、自分が叩いていなくても 403 / 429 が返りうる。
  //    ⭐ 失敗として投げれば既存のエントリーは上書きされない（→ PAT は工程13）。
  if (!res.ok) {
    throw new Error(`GitHub API が ${res.status}`)
  }

  const repos: GhRepo[] = await res.json()

  return repos.map((repo) => ({
    title: repo.name ?? '',
    url: repo.html_url ?? '',
    // ⚠️ pushed_at は空のリポジトリで null になりうる。toIsoOrNull が null に落とす。
    published_at: toIsoOrNull(repo.pushed_at),
    // GitHub にサムネイルに当たるものは無い。
    thumbnail_url: null,
  }))
}
