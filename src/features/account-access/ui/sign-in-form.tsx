'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { SIGNUP_PATH } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import type { SignInState } from '../api/actions';
import { Field } from '@/shared/ui/field';

type Props = {
  action: (state: SignInState, data: FormData) => Promise<SignInState>;
  next?: string;
};

export function SignInForm({ action, next = '' }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state?.formError ? (
        <p role="alert" className="text-danger">
          {state.formError}
        </p>
      ) : null}
      <Field
        label="ユーザー名またはメールアドレス"
        name="identifier"
        defaultValue={state?.values.identifier}
        autoComplete="username"
      />
      <Field label="パスワード" name="password" type="password" autoComplete="current-password" />
      <input type="hidden" name="next" value={next} />
      <Button type="submit" disabled={pending} className="h-[52px] text-body-lg">
        ログイン
      </Button>
      <p className="text-body text-text-muted">
        アカウントが無い場合は{' '}
        <Link href={SIGNUP_PATH} className="text-brand hover:underline">
          アカウントを作成
        </Link>
      </p>
    </form>
  );
}
