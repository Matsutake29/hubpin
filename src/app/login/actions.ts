'use server'

import { createClient } from '@/utils/supabase/server'
import { resetDemoData } from '@/lib/demo-seed'
import { demoCredentials } from '@/lib/env.server'
import { redirect } from 'next/navigation'

type LoginState = { message: string } | undefined

export async function login(prevState: LoginState, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
  })
  if (error) return { message: 'メールアドレスかパスワードが違います' }
  redirect('/dashboard')
}

export async function demoLogin(_prevState: LoginState) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(demoCredentials())
  if (error) {
    console.error('Demo login failed:', error.message)
    return { message: 'デモログインに失敗しました' }
  }
  await resetDemoData(supabase)
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
