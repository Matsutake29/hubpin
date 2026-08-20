import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { env } from '@/lib/env'

// 公開ページ専用。cookie を読まないので静的生成できる。
// 認証が要る処理では使わないこと（誰でもない状態で DB を読む）。
export function createPublicClient() {
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
