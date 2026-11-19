import { setupTestDb, testDb } from '@test/db';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { account, session, user } from '@/shared/db';

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
  // NFR-SEC-04: セッションの cookie は HttpOnly・SameSite=Lax。本番では Secure
  it('NFR-SEC-04: 登録の応答の cookie は HttpOnly・SameSite=Lax', async () => {
    const response = await signUpAs('Sample_01');
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/better-auth\.session_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('NFR-SEC-04: 本番（https の URL）では、セッションの cookie に Secure が付く。手元の http では付かない（#30）', async () => {
    expect((await signUpAs('Local_01')).headers.get('set-cookie')).not.toMatch(/;\s*Secure/i);
    vi.stubEnv('BETTER_AUTH_URL', 'https://x-modoki.example');
    try {
      const cookie = (await signUpAs('Prod_01')).headers.get('set-cookie') ?? '';
      expect(cookie).toMatch(/session_token=[^;]+;[^,]*Secure/i);
      expect(cookie).toMatch(/HttpOnly/i);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  // NFR-SEC-04: セッションの固定（T-04）
  it('ログインのたびに新しいセッションのトークンを出し、仕込まれたトークンは使わない（T-04、#33）', async () => {
    await signUpAs('Fixed_01');
    const { getAuth } = await load();
    const signInWith = async (cookie: string) => {
      const response = await getAuth().api.signInUsername({
        body: { username: 'fixed_01', password: 'correct-horse-battery' },
        headers: new Headers({ cookie }),
        asResponse: true,
      });
      const set = response.headers.get('set-cookie') ?? '';
      return decodeURIComponent(/better-auth\.session_token=([^;]+)/.exec(set)![1]).split('.')[0];
    };
    const planted = 'better-auth.session_token=attacker-planted-token';
    const first = await signInWith(planted);
    const second = await signInWith(planted);
    expect(first).not.toBe('attacker-planted-token');
    expect(second).not.toBe(first);
    const tokens = (await testDb().select({ token: session.token }).from(session)).map(
      (row) => row.token,
    );
    expect(tokens).toEqual(expect.arrayContaining([first, second]));
    expect(tokens).not.toContain('attacker-planted-token');
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
      // The saved look comes with the user's row, so the shell needs no query for it (#32).
      theme: 'light',
      accent: 'blue',
    });
    request.headers = new Headers();
    expect(await (await load()).getSession()).toBeNull();
  });

  it('見た目（theme・accent）は、登録のときに外から決められない（#32）', async () => {
    const { getAuth } = await load();
    for (const [field, value] of [
      ['theme', 'dark'],
      ['accent', 'pink'],
    ]) {
      await expect(
        getAuth().api.signUpEmail({
          body: {
            name: 'x',
            email: `look_${field}@example.test`,
            password: 'correct-horse-battery',
            username: `look_${field}`,
            [field]: value,
          } as never,
        }),
      ).rejects.toThrow(`${field} is not allowed to be set`);
    }
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
