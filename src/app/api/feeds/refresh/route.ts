import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { fetchEntries } from '@/lib/feed'

type ServiceClient = ReturnType<typeof createServiceClient>

// 🚨 export しない。route handler のファイルで export してよいのは HTTP メソッド名（GET / POST …）と
//    dynamic などのルート設定だけ。それ以外を export するとビルドが落ちる。
//    ⭐ actions.ts の prepareItem と「export しない」理由が違うことに注意（あちらは Server Action 化を避けるため）。
//
// 🚨 ログの書き込みが失敗しても throw しない。ログ取りの失敗で取得本体が止まるのは逆立ち。
async function writeFetchLog(
  supabase: ServiceClient,
  log: {
    sourceId: string
    status: 'success' | 'failure'
    entryCount?: number
    errorMessage?: string
  },
) {
  const { error } = await supabase.from('fetch_logs').insert({
    source_id: log.sourceId,
    status: log.status,
    entry_count: log.entryCount ?? null,
    error_message: log.errorMessage ?? null,
  })

  if (error) console.error('fetch_logs への記録に失敗:', error.message)
}

// フィードを取得して feed_entries に入れ替える入口。
//
// ⭐ route handler にしたのは、工程13 の Vercel Cron が「URL を叩く」仕組みだから。
//    ここがそのまま Cron の入口になる。
//
// 🚨 本番では 404 を返す。いま本番を守っているのは下の3行だけ。
//    これを外すのは CRON_SECRET のチェックを入れるのと同時（工程13）。
//    ⚠️ 片方だけやると誰でも叩ける入口が本番にできる。しかも「動いてしまう」のでテストでは落ちない。
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }

  const supabase = createServiceClient()

  const { data: sources, error } = await supabase
    .from('feed_sources')
    .select('id, provider, endpoint_url, fallback_url, max_entries')
    .eq('enabled', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { provider: string; saved?: number; error?: string }[] = []

  // 🚨 try/catch は for の中に置く。1媒体が失敗しても他の媒体は続ける（手順書 3-4 の障害設計）。
  //    外に置くと、Blog が落ちた日に Zenn と GitHub まで更新されなくなる。
  for (const source of sources) {
    try {
      const entries = await fetchEntries(source)

      // 🚨 replace_feed_entries() は渡されたものに入れ替えるだけなので、空配列を渡すと
      //    既存のエントリーが全部消える。「取れなかった」を「0件だった」に変換しない。
      if (entries.length === 0) {
        throw new Error('取得は成功したが0件だった')
      }

      const { data: saved, error: saveError } = await supabase.rpc('replace_feed_entries', {
        p_source_id: source.id,
        p_entries: entries,
      })

      if (saveError) throw new Error(saveError.message)

      await writeFetchLog(supabase, {
        sourceId: source.id,
        status: 'success',
        entryCount: saved ?? 0,
      })

      results.push({ provider: source.provider, saved: saved ?? 0 })
    } catch (e) {
      // 📌 成功時の last_status は関数の中で書いている（delete / insert と同じトランザクションに
      //    入れるため）。失敗したときは関数を呼べないので、failure はここで書くしかない。
      await supabase
        .from('feed_sources')
        .update({ last_fetched_at: new Date().toISOString(), last_status: 'failure' })
        .eq('id', source.id)

      await writeFetchLog(supabase, {
        sourceId: source.id,
        status: 'failure',
        errorMessage: String(e),
      })

      results.push({ provider: source.provider, error: String(e) })
    }
  }

  return NextResponse.json(results)
}
