import { login } from "./actions";

export default async function LoginPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">ログイン</h1>
      <form action={login}>
        <div>
          <label htmlFor="email">Email</label>
          <input type="email" id="email" name="email" placeholder="hubpin@example.com" required />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input type="password" id="password" name="password" placeholder="********" required />
        </div>
        <button type="submit">ログイン</button>
      </form>
    </main>
  );
}
