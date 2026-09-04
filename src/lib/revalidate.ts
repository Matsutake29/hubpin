import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// 公開ページ（/[username]）のキャッシュを捨てる。
//
// 🚨 'use server' のファイルには置けない。export した瞬間 Server Action になり、
//    ブラウザから POST で叩ける入口が1つ増える。しかも第1引数の Supabase クライアントは
//    シリアライズできないので、Server Action としてはそもそも成立しない。
//    → だから actions.ts から出した（2026-09-03 手順R0 B-1 / B-2）。
//
// 🚨 引数を SupabaseClient<Database> にしてあるのは、cookie ベース（actions.ts）と
//    service role（Cron の route.ts）の両方から呼ぶため。
//    ⚠️ 置き場所を移すだけでは足りない。actions.ts では cookie クライアントに型が
//       固定されていて service client を渡せなかった。「置き場所」と「引数の型」は
//       別の問題で、両方に手当てが要る。
export async function revalidatePublicPage(supabase: SupabaseClient<Database>, userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle()

  // 🚨 supabase-js はクエリのエラーで throw しない。GRANT を忘れていると
  //    permission denied が error に入って data が null になり、
  //    if (profile) を通らないだけで例外もログも出ない ＝ 静かに再検証されなくなる。
  //    「効かなくなったことに気づけない」を潰すため、error は必ず出す。
  if (error) {
    console.error('profiles の読み取りに失敗（再検証をスキップ）:', error.message)
    return
  }

  if (profile) revalidatePath(`/${profile.username}`)
}
