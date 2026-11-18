'use client'
import { login, demoLogin } from './actions'
import { useActionState } from 'react'

export function LoginForm() {
  const [state, formAction] = useActionState(login, undefined)
  const [demoState, demoFormAction] = useActionState(demoLogin, undefined)
  return (
    <div className="flex flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-4">
        {/* 🚨 label と input を縦に積む。<div> に並べただけだと両方 inline なので
            横に並び、「Emailhubpin@example.com」と地続きに見える */}
        <div className="flex flex-col gap-1.5">
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            className="field"
            type="email"
            id="email"
            name="email"
            placeholder="hubpin@example.com"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            className="field"
            type="password"
            id="password"
            name="password"
            placeholder="********"
            required
          />
        </div>

        {/* 🚨 エラーはボタンより前に出す。押した結果が押した場所の下に出ると、
            画面の下端で入力しているときに視界の外へ落ちて「何も起きなかった」に見える
            🚨 ライブリージョンは常に置いておき、中身だけ差し替える。要素ごと後から足すと、
            フォーカスは送信ボタンに残ったままなので読み上げが起きない（WCAG 4.1.3） */}
        <div aria-live="assertive" className="empty:hidden">
          {state?.message && <p className="form-error">{state.message}</p>}
        </div>

        <button className="btn-primary" type="submit">
          ログイン
        </button>
      </form>

      {/* 罫で切る。本人のログインとデモは別の行為で、押し間違える場所ではない。
          ⚠️ デモは採用担当が最初に触る導線なので、隠さず同じ強さの近くに置く */}
      <div className="flex flex-col gap-3 border-t border-line pt-8">
        <div aria-live="assertive" className="empty:hidden">
          {demoState?.message && <p className="form-error">{demoState.message}</p>}
        </div>
        <form action={demoFormAction}>
          {/* 一覧の「公開/非公開」バッジと同じ枠線ボタン。主導線（bg-main）より一段弱い */}
          <button className="btn-outline w-full rounded-(--radius) px-4 py-2 text-sm" type="submit">
            デモログイン
          </button>
        </form>
      </div>
    </div>
  )
}
