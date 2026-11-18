'use server';

import { redirect } from 'next/navigation';
import { safeNextPath } from '@/shared/lib/safe-next';
import { signInSchema, signUpSchema } from '../model/schema';
import { signIn, signOut, signUp } from './auth-flows';

export type SignUpState =
  | {
      fieldErrors?: Partial<Record<'name' | 'username' | 'email' | 'password', string[]>>;
      formError?: string;
      values: { name: string; username: string; email: string };
    }
  | undefined;

export type SignInState = { formError: string; values: { identifier: string } } | undefined;

const WRONG = 'ユーザー名・メールアドレスかパスワードが正しくありません';
const TOO_MANY = '試行が多すぎます。しばらく待ってから、もう一度お試しください';

const text = (data: FormData, key: string) => String(data.get(key) ?? '');

export async function signUpAction(_: SignUpState, data: FormData): Promise<SignUpState> {
  const values = {
    name: text(data, 'name'),
    username: text(data, 'username'),
    email: text(data, 'email'),
  };
  const parsed = signUpSchema.safeParse({ ...values, password: text(data, 'password') });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  const result = await signUp(parsed.data);
  if (result.ok) redirect('/home');
  return result.error === 'VALIDATION'
    ? { fieldErrors: result.fieldErrors, values }
    : { formError: TOO_MANY, values };
}

export async function signInAction(_: SignInState, data: FormData): Promise<SignInState> {
  const values = { identifier: text(data, 'identifier') };
  const parsed = signInSchema.safeParse({ ...values, password: text(data, 'password') });
  if (!parsed.success) return { formError: WRONG, values };
  const result = await signIn(parsed.data);
  if (result.ok) redirect(safeNextPath(text(data, 'next')));
  return { formError: result.error === 'RATE_LIMITED' ? TOO_MANY : WRONG, values };
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect('/');
}
