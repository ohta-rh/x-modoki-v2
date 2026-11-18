import { setupTestDb, testDb } from '@test/db';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { account, user } from '@/shared/db';

// Next.js request APIs and React's per-request cache exist only inside a request; stand in for them.
const request = { headers: new Headers() };
vi.mock('next/headers', () => ({ headers: async () => request.headers }));
vi.mock('next/server', () => ({ connection: async () => undefined }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <A extends unknown[], T>(fn: (...args: A) => T) => {
    let value: { v: T } | undefined;
    return (...args: A) => (value ??= { v: fn(...args) }).v;
  },
}));

setupTestDb();

async function load() {
  vi.resetModules();
  return import('./auth');
}

async function signUpAs(username: string) {
  const { getAuth } = await load();
  const response = await getAuth().api.signUpEmail({
    body: {
      name: 'サンプル',
      email: `${username.toLowerCase()}@example.test`,
      password: 'correct-horse-battery',
      username,
      displayUsername: username,
    },
    asResponse: true,
  });
  return response;
}

beforeEach(() => {
  request.headers = new Headers();
});

describe('getAuth（ADR-0007、#10 の調査の設定）', () => {
  it('NFR-SEC-04: 登録の応答の cookie は HttpOnly・SameSite=Lax', async () => {
    const response = await signUpAs('Sample_01');
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/better-auth\.session_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('ユーザー名は小文字で、入力したままの形も残し、パスワードはハッシュで入る', async () => {
    await signUpAs('Sample_01');
    const [row] = await testDb().select().from(user).where(eq(user.username, 'sample_01'));
    expect(row.displayUsername).toBe('Sample_01');
    const [credential] = await testDb().select().from(account).where(eq(account.userId, row.id));
    expect(credential.password).not.toContain('correct-horse-battery');
    expect(credential.password?.length).toBeGreaterThan(40);
  });
});

describe('username のプラグインの検証（アプリと同じ決まり）', () => {
  it.each(['home', 'a.b.c', 'abc'])('%s は、サーバーの中から呼んでも登録できない', async (name) => {
    const { getAuth } = await load();
    await expect(
      getAuth().api.signUpEmail({
        body: {
          name: 'x',
          email: `${name}@example.test`,
          password: 'correct-horse-battery',
          username: name,
        },
      }),
    ).rejects.toMatchObject({ body: { code: expect.stringMatching(/USERNAME/) } });
  });
});

describe('getSession と requireSession', () => {
  it('cookie があれば、その人を DTO で返す。無ければ null', async () => {
    const response = await signUpAs('Sample_02');
    request.headers = new Headers({ cookie: response.headers.get('set-cookie')!.split(';')[0] });
    const { getSession } = await load();
    expect(await getSession()).toEqual({
      id: expect.any(String),
      name: 'サンプル',
      username: 'sample_02',
      displayUsername: 'Sample_02',
      image: null,
    });
    request.headers = new Headers();
    expect(await (await load()).getSession()).toBeNull();
  });

  it('同じリクエストの中では、セッションを 1 回だけ読む', async () => {
    const response = await signUpAs('Sample_03');
    request.headers = new Headers({ cookie: response.headers.get('set-cookie')!.split(';')[0] });
    const { getAuth, getSession } = await load();
    const read = vi.spyOn(getAuth().api, 'getSession');
    await Promise.all([getSession(), getSession(), getSession()]);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('requireSession は、入っていなければログインへ送り、入っていればその人を返す', async () => {
    await expect((await load()).requireSession()).rejects.toThrow('NEXT_REDIRECT /i/flow/login');
    const response = await signUpAs('Sample_04');
    request.headers = new Headers({ cookie: response.headers.get('set-cookie')!.split(';')[0] });
    expect((await (await load()).requireSession()).username).toBe('sample_04');
  });
});
