// 環境変数の入口。ここ以外で process.env を直に読まない。
//
// 🚨 これまで各所に process.env.NEXT_PUBLIC_SUPABASE_URL! と書いていた。! は
//    「無いはずがない」と型に嘘をつくだけで、実際に無いときは何も守らない。
//    しかも落ちるのは「環境変数がありません」ではなく URL のパースエラーで、
//    原因から遠い場所で落ちる（2026-08-17 工程10 の指摘）。
//    ここで一度だけ検証して、名前を言って落ちるようにする。
//
// ⚠️ 同じ2つの値を4ファイル（client / server / public / proxy）が
//    それぞれ読んでいた。読む場所を1つにするのがこのファイルの目的でもある。

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `環境変数 ${name} が設定されていません。.env.local を確認してください（キー名は .env.example にあります）`,
    )
  }
  return value
}

// 🚨 NEXT_PUBLIC_ の値は「process.env.NEXT_PUBLIC_XXX」と書かれたとおりの形でしか
//    ビルド時に置換されない。process.env[name] のような動的アクセスにすると置換されず、
//    ブラウザ側で undefined になる。だから展開はここに直に書く。
//
// 📌 モジュールの読み込み時に検証している。ビルドが通った時点で値があることが確定するので、
//    ブラウザ側で throw されることはない（値はビルド時に埋め込まれている）。
export const env = {
  supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: required(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
}
