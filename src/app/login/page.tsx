import { LoginForm } from "./login-form";

export default async function LoginPage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">ログイン</h1>
      <LoginForm />
    </main>
  );
}
