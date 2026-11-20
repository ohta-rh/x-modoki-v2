import { z } from 'zod';
import { RESERVED_USERNAMES, USERNAME_PATTERN } from '@/shared/config';
import { cleanText } from '@/shared/lib/text';

export const signUpSchema = z
  .object({
    name: z
      .string()
      .overwrite(cleanText)
      .min(1, '名前を入れてください')
      .max(50, '名前は 50 文字までにしてください'),
    username: z
      .string()
      .trim()
      .regex(USERNAME_PATTERN, 'ユーザー名は英数字とアンダースコアの 4〜15 文字にしてください')
      .refine(
        (name) => !RESERVED_USERNAMES.includes(name.toLowerCase()),
        'このユーザー名は使えません',
      ),
    email: z.string().trim().toLowerCase().pipe(z.email('メールアドレスの形が正しくありません')),
    password: z
      .string()
      .min(8, 'パスワードは 8 文字以上にしてください')
      .max(128, 'パスワードは 128 文字までにしてください'),
  })
  .transform(({ username, ...rest }) => ({
    ...rest,
    username: username.toLowerCase(),
    displayUsername: username,
  }));

export type SignUpInput = z.output<typeof signUpSchema>;

export const signInSchema = z
  .object({ identifier: z.string().overwrite(cleanText).min(1), password: z.string().min(1) })
  .transform(({ identifier, password }) =>
    identifier.includes('@')
      ? { kind: 'email' as const, email: identifier.toLowerCase(), password }
      : { kind: 'username' as const, username: identifier.toLowerCase(), password },
  );

export type SignInInput = z.output<typeof signInSchema>;
