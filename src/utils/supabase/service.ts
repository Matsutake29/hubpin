import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { env } from '@/lib/env'
import { supabaseSecretKey } from '@/lib/env.server'

// 🚨 service role で繋ぐ。RLS をバイパスし、GRANT された範囲で全ユーザーのデータに触れる。
//    ⭐ 08-31 実測: GRANT は効くので、grant していないテーブルには触れない
//       （feed_entries / feed_sources だけを明示的に grant してある）。
//
// 🚨 サーバー側（route handler）からしか import しないこと。
//    ⚠️  クライアントコンポーネントから import すると、ビルドは通るのに実行時に落ちる
//       （SUPABASE_SECRET_KEY は NEXT_PUBLIC_ ではないのでブラウザに渡らない）。
export function createServiceClient() {
  return createClient<Database>(env.supabaseUrl, supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}