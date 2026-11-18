import type { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/proxy'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

// 🚨 Supabase 公式テンプレートの matcher（_next 以外の全部）から、/dashboard だけに絞った（#52）。
//    全部に掛けると、CDN が静的な公開ページを返す前に毎回この関数が起動する。
//    public/ の画像（OGP 画像はクローラが必ず取りに来る）や <Link> の prefetch でも起動していた。
//    ⚠️ 代わりに、ログイン中の人が公開ページだけを見ている間はトークンが更新されない。
//       このアプリでは、公開ページに長居する導線が無く、/dashboard に入れば更新され、
//       Server Action も cookie を書けるので、実害は小さいと判断した。
//    ⭐ 下の分岐（未ログインなら /login へ）が見ているのも /dashboard だけ。
export const config = {
  matcher: ['/dashboard/:path*'],
}
