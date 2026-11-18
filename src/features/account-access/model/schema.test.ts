import { describe, expect, it } from 'vitest';
import { RESERVED_USERNAMES } from '@/shared/config';
import { signInSchema, signUpSchema } from './schema';

const valid = {
  name: 'サンプル',
  username: 'sample_01',
  email: 'a@example.test',
  password: 'p'.repeat(8),
};
const errors = (input: Record<string, string>) => {
  const result = signUpSchema.safeParse({ ...valid, ...input });
  return result.success ? {} : result.error.flatten().fieldErrors;
};

describe('signUpSchema（FR-AUTH、routing.md の 4 節）', () => {
  it('正しい入力を通し、ユーザー名を小文字にそろえる', () => {
    expect(signUpSchema.parse({ ...valid, username: 'Sample_01' })).toMatchObject({
      username: 'sample_01',
      displayUsername: 'Sample_01',
    });
  });

  it.each(['abc', 'a'.repeat(16), 'has-dash', 'has space', 'ひらがな'])(
    'ユーザー名 %s は、英数字とアンダースコアの 4〜15 文字でないので拒む',
    (username) => {
      expect(errors({ username }).username).toEqual([
        'ユーザー名は英数字とアンダースコアの 4〜15 文字にしてください',
      ]);
    },
  );

  it.each(['settings', 'Home', ['TWIT', 'TER'].join(''), 'modoki'])(
    '予約の語 %s を拒む',
    (username) => {
      expect(errors({ username }).username).toEqual(['このユーザー名は使えません']);
    },
  );

  it('予約の語の一覧は routing.md の 4 節のとおり', () => {
    expect(RESERVED_USERNAMES).toEqual(
      expect.arrayContaining([
        'home',
        'explore',
        'i',
        'compose',
        'settings',
        'api',
        'x',
        ['twit', 'ter'].join(''),
        'modoki',
      ]),
    );
    expect(RESERVED_USERNAMES).toHaveLength(31);
  });

  it('パスワードは 8 文字以上', () => {
    expect(errors({ password: 'p'.repeat(7) }).password).toEqual([
      'パスワードは 8 文字以上にしてください',
    ]);
  });

  it('名前は 1〜50 文字、メールアドレスは形を確かめる', () => {
    expect(errors({ name: '' }).name).toEqual(['名前を入れてください']);
    expect(errors({ name: 'あ'.repeat(51) }).name).toEqual(['名前は 50 文字までにしてください']);
    expect(errors({ email: 'not-an-email' }).email).toEqual([
      'メールアドレスの形が正しくありません',
    ]);
  });
});

describe('signInSchema', () => {
  it('@ を含めばメールアドレス、含まなければユーザー名（小文字）として読む', () => {
    expect(signInSchema.parse({ identifier: 'A@Example.test', password: 'x' })).toEqual({
      kind: 'email',
      email: 'a@example.test',
      password: 'x',
    });
    expect(signInSchema.parse({ identifier: ' Sample_01 ', password: 'x' })).toEqual({
      kind: 'username',
      username: 'sample_01',
      password: 'x',
    });
  });

  it('空の入力を拒む', () => {
    expect(signInSchema.safeParse({ identifier: '', password: '' }).success).toBe(false);
  });
});
