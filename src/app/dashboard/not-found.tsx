import Link from 'next/link'

// 🚨 この階層に置くと /dashboard/* の notFound() だけを受ける。
//    app/not-found.tsx に置くとサイト全体の404になり、公開ページの見え方まで変わる
export default function DashboardNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-6 py-24 text-center">
      <p className="text-2xl font-bold tracking-tight">カードが見つかりません</p>

      {/* 🚨 「権限がありません」とは書かない。RLS は他人の行を0行で返すだけなので、
          アプリからは「存在しない」と「他人のもの」を区別できない。
          区別していないことを、区別したかのように書かない */}
      {/* 🚨 text-balance が無いと「…ありませんでし / た。」と最後の1文字だけ落ちる。
          日本語は単語の切れ目で折り返さないので、幅を決め打ちすると必ずどこかで起きる */}
      <p className="max-w-md text-balance text-sm leading-6 text-muted">
        あなたのカードの中に、このURLのものはありませんでした。
      </p>

      {/* 一覧の「編集」と同じリンクの見た目にする。404 は行き止まりを知らせる画面で、
          ここで何かを始めてほしいわけではないので、追加ボタンと同じ強さにはしない */}
      <Link
        href="/dashboard"
        className="mt-2 text-sm text-main underline underline-offset-4"
      >
        カード一覧に戻る
      </Link>
    </div>
  )
}
