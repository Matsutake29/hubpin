import type { NormalizedEntry } from './types'
import { toIsoOrNull } from './date'
import { feedFetchSignal, withParams } from './http'

type GhRepo = {
  name?: string
  html_url?: string
  // 空のリポジトリでは null が来る（API の実際の値）。型に書いておけば tsc が覚えてくれる。
  pushed_at?: string | null
}

export async function fetchGitHub(endpoint: string, max: number): Promise<NormalizedEntry[]> {
  // 🚨 sort は pushed。updated ではない。updated_at は push では動かないことがある
  //    （2026-09-01 実測: hubpin は pushed 09-01 08:51 なのに updated 08-21 02:09 で、
  //      sort=updated だと9件中3番目に落ちる）。
  //    ⚠️ per_page でここが切るので、並べ替えのキーが published_at と違うと
  //       「取ってくる集合」自体がずれる。出口の sortAndTake では直せない
  //       —— 届かなかったリポジトリは並べようがない。
  const url = withParams(endpoint, { sort: 'pushed', per_page: String(max) })

  // 🚨 User-Agent が空だと 403 を返す（GitHub の明示的な要件）。
  //    fetch の既定値 "node" でも通ってしまうが、名乗るほうを選ぶ。
  const res = await fetch(url, {
    headers: { 'User-Agent': 'hubpin' },
    signal: feedFetchSignal(),
  })

  // 🚨 未認証は 60 req/h、しかも送信元 IP 単位で数えられる。Vercel の Functions は
  //    共有 IP から出るので、自分が叩いていなくても 403 / 429 が返りうる。
  //    ⭐ 失敗として投げれば既存のエントリーは上書きされない（→ PAT は工程13）。
  if (!res.ok) {
    throw new Error(`GitHub API が ${res.status}`)
  }

  const json: unknown = await res.json()
  if (!Array.isArray(json)) {
    throw new Error('GitHub API が配列を返さなかった')
  }
  const repos: GhRepo[] = json

  return repos.map((repo) => ({
    title: repo.name ?? '',
    url: repo.html_url ?? '',
    // pushed_at が null なら toIsoOrNull が null に落とす。
    published_at: toIsoOrNull(repo.pushed_at),
    // GitHub にサムネイルに当たるものは無い。
    thumbnail_url: null,
  }))
}
