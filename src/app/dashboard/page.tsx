import { createClient } from '@/utils/supabase/server'

export default async function DashboardPage() {

  const client = await createClient()
  const { data } = await client.auth.getClaims()
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">dashboard</h1>
      <p>ログイン中: {data?.claims.email}</p>
    </main>
  )
}