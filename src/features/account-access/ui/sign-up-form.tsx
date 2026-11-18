'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { LOGIN_PATH } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import type { SignUpState } from '../api/actions';
import { Field } from '@/shared/ui/field';

type Props = { action: (state: SignUpState, data: FormData) => Promise<SignUpState> };

export function SignUpForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.fieldErrors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state?.formError ? (
        <p role="alert" className="text-danger">
          {state.formError}
        </p>
      ) : null}
      <Field
        label="名前"
        name="name"
        defaultValue={state?.values.name}
        errors={errors.name}
        autoComplete="name"
      />
      <Field
        label="ユーザー名"
        name="username"
        defaultValue={state?.values.username}
        errors={errors.username}
        autoComplete="username"
      />
      <Field
        label="メールアドレス"
        name="email"
        type="email"
        defaultValue={state?.values.email}
        errors={errors.email}
        autoComplete="email"
      />
      <Field
        label="パスワード"
        name="password"
        type="password"
        errors={errors.password}
        autoComplete="new-password"
      />
      <Button type="submit" disabled={pending} className="h-[52px] text-body-lg">
        登録する
      </Button>
      <p className="text-body text-text-muted">
        アカウントをお持ちの場合は{' '}
        <Link href={LOGIN_PATH} className="text-brand underline">
          ログイン
        </Link>
      </p>
    </form>
  );
}
