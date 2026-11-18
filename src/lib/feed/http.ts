// 🚨 Node の fetch に既定のタイムアウトは無い。繋がるのに body を返さない相手に当たると
//    そこで止まり、直列ループの後ろのソースは取得にすら入らない。
//    しかもプラットフォームが関数を打ち切ると catch が走らず、fetch_logs にも
//    last_status にも何も残らない（＝「前日の成功のまま記事だけ古くなる」）。
//    ⭐ 打ち切りは AbortError として throw されるので、既存の catch がそのまま失敗として記録する。
export const FEED_FETCH_TIMEOUT_MS = 10_000

export function feedFetchSignal(): AbortSignal {
  return AbortSignal.timeout(FEED_FETCH_TIMEOUT_MS)
}

// 🚨 文字列連結で ?per_page= を足すと、endpoint に既にクエリがあるとき `?a=1?per_page=3` に壊れる。
//    ⭐ new URL() は不正な文字列で throw するので、設定ミスもその場で失敗として記録される。
export function withParams(endpoint: string, params: Record<string, string>): string {
  const url = new URL(endpoint)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}
