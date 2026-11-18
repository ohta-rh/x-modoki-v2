import { setupTestDb, testDb } from '@test/db';
import { count } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rateLimits, user } from '@/shared/db';

const request = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock('next/headers', () => ({
  headers: async () => request.headers,
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
}));
vi.mock('next/server', () => ({ connection: async () => undefined }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));

setupTestDb();

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
const account = {
  name: 'サンプル',
  username: 'Sample_01',
  email: 'sample_01@example.test',
  password: 'correct-horse-battery',
};

async function load() {
  vi.resetModules();
  return import('./actions');
}

beforeEach(() => {
  request.headers = new Headers({ 'x-forwarded-for': '198.51.100.9' });
});

describe('signUpAction', () => {
  it('正しい入力なら登録して /home へ送る', async () => {
    await expect((await load()).signUpAction(undefined, form(account))).rejects.toThrow(
      'NEXT_REDIRECT /home',
    );
    expect((await testDb().select({ n: count() }).from(user))[0].n).toBe(1);
  });

  it('入力の誤りは欄ごとに返し、入れた値を戻し、データベースに触れない', async () => {
    const state = await (
      await load()
    ).signUpAction(undefined, form({ ...account, username: 'settings', password: 'short' }));
    expect(state).toEqual({
      fieldErrors: {
        username: ['このユーザー名は使えません'],
        password: ['パスワードは 8 文字以上にしてください'],
      },
      values: { name: 'サンプル', username: 'settings', email: 'sample_01@example.test' },
    });
    expect(await testDb().select().from(rateLimits)).toEqual([]);
  });

  it('使われているユーザー名は欄の誤りとして返す', async () => {
    await (await load()).signUpAction(undefined, form(account)).catch(() => undefined);
    const state = await (
      await load()
    ).signUpAction(undefined, form({ ...account, email: 'other@example.test' }));
    expect(state?.fieldErrors).toEqual({ username: ['このユーザー名は使われています'] });
  });

  it('回数の制限を超えたら、待つように言う', async () => {
    const { signUpAction } = await load();
    let state;
    for (let i = 0; i < 11; i += 1) {
      state = await signUpAction(
        undefined,
        form({ ...account, username: `limit_${i}xx`, email: `l${i}@example.test` }),
      ).catch(() => undefined);
    }
    expect(state?.formError).toBe('試行が多すぎます。しばらく待ってから、もう一度お試しください');
  });
});

describe('signInAction', () => {
  beforeEach(async () => {
    await (await load()).signUpAction(undefined, form(account)).catch(() => undefined);
  });

  it('入れたら、戻り先が同じサイトのパスならそこへ、そうでなければ /home へ送る', async () => {
    const { signInAction } = await load();
    const credentials = { identifier: 'sample_01', password: account.password };
    await expect(
      signInAction(undefined, form({ ...credentials, next: '/notifications' })),
    ).rejects.toThrow('NEXT_REDIRECT /notifications');
    await expect(
      signInAction(undefined, form({ ...credentials, next: '//evil.test' })),
    ).rejects.toThrow('NEXT_REDIRECT /home');
  });

  it('戻り先の欄が無ければ /home へ送る', async () => {
    await expect(
      (await load()).signInAction(
        undefined,
        form({ identifier: 'sample_01', password: account.password }),
      ),
    ).rejects.toThrow('NEXT_REDIRECT /home');
  });

  it('間違えたら、どちらが違うかを言わない 1 つの文言を返す', async () => {
    const state = await (
      await load()
    ).signInAction(
      undefined,
      form({ identifier: 'sample_01', password: 'wrong-password', next: '' }),
    );
    expect(state).toEqual({
      formError: 'ユーザー名・メールアドレスかパスワードが正しくありません',
      values: { identifier: 'sample_01' },
    });
  });

  it('空の入力は、同じ文言で返す', async () => {
    const state = await (
      await load()
    ).signInAction(undefined, form({ identifier: '', password: '' }));
    expect(state?.formError).toBe('ユーザー名・メールアドレスかパスワードが正しくありません');
  });

  it('回数の制限を超えたら、待つように言う', async () => {
    const { signInAction } = await load();
    let state;
    for (let i = 0; i < 11; i += 1) {
      state = await signInAction(
        undefined,
        form({ identifier: 'sample_01', password: 'wrong-password' }),
      );
    }
    expect(state?.formError).toBe('試行が多すぎます。しばらく待ってから、もう一度お試しください');
  });
});

describe('signOutAction', () => {
  it('ログアウトして / へ送る', async () => {
    await expect((await load()).signOutAction()).rejects.toThrow('NEXT_REDIRECT /');
  });
});
