"use client";
import { login,demoLogin } from "./actions";
import { useActionState } from "react";

export function LoginForm() {
  const [state, formAction] = useActionState(login, undefined)
  const [demoState, demoFormAction] = useActionState(demoLogin, undefined)
  return (
    <>
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email">Email</label>
        <input type="email" id="email" name="email" placeholder="hubpin@example.com" required />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input type="password" id="password" name="password" placeholder="********" required />
      </div>
      <button type="submit">ログイン</button>
      {state?.message && <p className="text-red-500">{state.message}</p>}
    </form>
    <form action={demoFormAction} className="flex flex-col gap-4">
      <button type="submit">デモログイン</button>
      {demoState?.message && <p className="text-red-500">{demoState.message}</p>}
    </form>
    </>
  );
}
