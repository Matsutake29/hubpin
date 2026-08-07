'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

type LoginState = { message: string } | undefined

export async function login(prevState: LoginState, formData: FormData) {
  const supabase  = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
  });

  if (error) return { message: 'メールアドレスかパスワードが違います' }
  redirect('/dashboard');
}