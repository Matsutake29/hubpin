// env.ts と env.server.ts の両方が使う、必須の環境変数のガード（#53-6）。
//
// ⚠️ 以前は2つのファイルに同じ関数を1つずつ持っていて、文言だけ違っていた
//    （.env.example への案内が、それを一番見に行くはずのサーバー側に無かった）。
// ⭐ ファイルを分けた理由は「値の置き場所」（クライアントのバンドルに名前を載せない）であって、
//    ガードを2つ持つ理由にはならない。値を持たない関数だけを切り出したので、
//    クライアントから import されても何も漏れない。
export function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `環境変数 ${name} が設定されていません。.env.local を確認してください（キー名は .env.example にあります）`,
    )
  }
  return value
}
