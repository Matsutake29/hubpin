import { LoginForm } from './login-form'

export default async function LoginPage() {
  return (
    // 🚨 dashboard/layout.tsx の外なので、外枠はこの画面が自分で持つ。
    //    他ページと同じ「mx-auto flex w-full max-w-* flex-col gap-* px-6 py-*」の形にする。
    //    幅だけ md（448px）まで絞る。入力が2つしかない画面で 2xl まで広げると、
    //    ラベルと入力欄が離れすぎて対応が読めなくなる
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-16 sm:py-24">
      <h1 className="text-2xl font-bold tracking-tight">ログイン</h1>
      <LoginForm />
    </main>
  )
}
