import { z } from 'zod';
import { RESERVED_USERNAMES } from '@/shared/config';

const USERNAME = /^[A-Za-z0-9_]{4,15}$/;

export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, '名前を入れてください')
      .max(50, '名前は 50 文字までにしてください'),
    username: z
      .string()
      .trim()
      .regex(USERNAME, 'ユーザー名は英数字とアンダースコアの 4〜15 文字にしてください')
      .refine(
        (name) => !RESERVED_USERNAMES.includes(name.toLowerCase()),
        'このユーザー名は使えません',
      ),
    email: z.string().trim().toLowerCase().pipe(z.email('メールアドレスの形が正しくありません')),
    password: z.string().min(8, 'パスワードは 8 文字以上にしてください'),
  })
  .transform(({ username, ...rest }) => ({
    ...rest,
    username: username.toLowerCase(),
    displayUsername: username,
  }));

export type SignUpInput = z.output<typeof signUpSchema>;

export const signInSchema = z
  .object({ identifier: z.string().trim().min(1), password: z.string().min(1) })
  .transform(({ identifier, password }) =>
    identifier.includes('@')
      ? { kind: 'email' as const, email: identifier.toLowerCase(), password }
      : { kind: 'username' as const, username: identifier.toLowerCase(), password },
  );

export type SignInInput = z.output<typeof signInSchema>;
