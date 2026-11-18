// 🚨 サーバー専用。クライアントコンポーネントから import しないこと。
//    NEXT_PUBLIC_ が付かない値はブラウザへ渡らないので、読んでも undefined になる。
//
// ⚠️ env.ts と分けている理由: あちらは NEXT_PUBLIC_ だけを扱い、クライアントからも
//    読まれる。デモの認証情報を同じファイルに置くと、import の経路しだいで
//    クライアント側のバンドルに名前が載りうる。ファイルごと分けて、名前で意図を示す。

import { required } from './env-required'

// 🚨 以下はどれも、モジュールの読み込み時ではなく「呼ばれたとき」に検証する。
//    モジュールレベルで検証すると、値を渡していない環境（CI の build）でそこが落ちる。
// ⭐ NEXT_PUBLIC_ と違ってビルド時に埋め込む必要がない値なので、遅延で足りる。

// 🚨 service role キー。RLS をバイパスできる値なので、読むのはサーバー側だけ。
//    → 使う側は src/utils/supabase/service.ts
export function supabaseSecretKey() {
  return required('SUPABASE_SECRET_KEY', process.env.SUPABASE_SECRET_KEY)
}

// ⚠️ CI の build には DEMO_EMAIL / DEMO_PASSWORD を渡していない
//    （.github/workflows/ci.yml は NEXT_PUBLIC_ の2つだけ）。
export function demoCredentials() {
  return {
    email: required('DEMO_EMAIL', process.env.DEMO_EMAIL),
    password: required('DEMO_PASSWORD', process.env.DEMO_PASSWORD),
  }
}

// 🚨 Cron の入口（api/feeds/refresh）の合言葉。required() に通さない（#53-5）。
//    未設定のときに throw するのではなく「全部 401」が正しい挙動なので、
//    undefined のまま返し、判定は呼ぶ側（!cronSecret を先に見る）に任せる。
export function cronSecret(): string | undefined {
  return process.env.CRON_SECRET
}
