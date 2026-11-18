import { setupTestDb, testDb } from '@test/db';
import { count, eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { session, user } from '@/shared/db';

// Next.js request APIs and React's per-request cache exist only inside a request; stand in for them.
const request = vi.hoisted(() => ({ headers: new Headers(), cookies: new Map<string, string>() }));
const nextHeaders = vi.hoisted(
  () => (request: { headers: Headers; cookies: Map<string, string> }) => ({
    headers: async () => request.headers,
    cookies: async () => ({
      get: (name: string) =>
        request.cookies.has(name) ? { name, value: request.cookies.get(name) } : undefined,
      set: (name: string, value: string) => request.cookies.set(name, value),
      delete: (name: string) => request.cookies.delete(name),
    }),
  }),
);
vi.mock('next/headers', () => nextHeaders(request));
vi.mock('next/server', () => ({ connection: async () => undefined }));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <A extends unknown[], T>(fn: (...args: A) => T) => {
    let value: { v: T } | undefined;
    return (...args: A) => (value ??= { v: fn(...args) }).v;
  },
}));

setupTestDb();

const input = (username: string) => ({
  name: 'サンプル',
  username: username.toLowerCase(),
  displayUsername: username,
  email: `${username.toLowerCase()}@example.test`,
  password: 'correct-horse-battery',
});

async function load() {
  vi.resetModules();
  return import('./auth-flows');
}

// hitRateLimit counts in one-minute windows; pin the clock mid-minute so 11 attempts share one (#46).
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-18T12:00:10Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  request.headers = new Headers({ 'x-forwarded-for': '203.0.113.7' });
  request.cookies = new Map();
});

describe('signUp', () => {
  it('人とアカウントを作り、ok を返す', async () => {
    expect(await (await load()).signUp(input('Sample_01'))).toEqual({ ok: true });
    expect((await testDb().select({ n: count() }).from(user))[0].n).toBe(1);
  });

  it('大文字と小文字だけ違うユーザー名は、使われているとして拒む（T-09）', async () => {
    await (await load()).signUp(input('Sample_01'));
    const result = await (
      await load()
    ).signUp({ ...input('SAMPLE_01'), email: 'other@example.test' });
    expect(result).toEqual({
      ok: false,
      error: 'VALIDATION',
      fieldErrors: { username: ['このユーザー名は使われています'] },
    });
  });

  it('使われているメールアドレスを拒む', async () => {
    await (await load()).signUp(input('Sample_01'));
    const result = await (
      await load()
    ).signUp({ ...input('Sample_02'), email: 'sample_01@example.test' });
    expect(result).toEqual({
      ok: false,
      error: 'VALIDATION',
      fieldErrors: { email: ['このメールアドレスは使われています'] },
    });
  });

  it('NFR-SEC-05: 同じ IP から 1 分に 11 回目は RATE_LIMITED', async () => {
    const { signUp } = await load();
    for (let i = 0; i < 10; i += 1) {
      expect((await signUp(input(`rate_${i}xx`))).ok).toBe(true);
    }
    expect(await signUp(input('rate_10xx'))).toEqual({ ok: false, error: 'RATE_LIMITED' });
  });
});

describe('signIn', () => {
  it('ユーザー名でもメールアドレスでも入れ、セッションの行ができる', async () => {
    await (await load()).signUp(input('Sample_01'));
    const { signIn } = await load();
    expect(
      await signIn({ kind: 'username', username: 'sample_01', password: 'correct-horse-battery' }),
    ).toEqual({ ok: true });
    expect(
      await signIn({
        kind: 'email',
        email: 'sample_01@example.test',
        password: 'correct-horse-battery',
      }),
    ).toEqual({ ok: true });
    expect((await testDb().select({ n: count() }).from(session))[0].n).toBe(3);
  });

  it('パスワードが違っても、人がいなくても、同じ INVALID_CREDENTIALS を返す', async () => {
    await (await load()).signUp(input('Sample_01'));
    const { signIn } = await load();
    const wrong = { ok: false, error: 'INVALID_CREDENTIALS' };
    expect(
      await signIn({ kind: 'username', username: 'sample_01', password: 'nope-nope' }),
    ).toEqual(wrong);
    expect(
      await signIn({ kind: 'username', username: 'nobody_here', password: 'nope-nope' }),
    ).toEqual(wrong);
    expect(
      await signIn({ kind: 'email', email: 'nobody@example.test', password: 'nope-nope' }),
    ).toEqual(wrong);
  });

  it('NFR-SEC-05: ログインも同じ IP から 1 分に 11 回目は RATE_LIMITED', async () => {
    const { signIn } = await load();
    for (let i = 0; i < 10; i += 1) {
      await signIn({ kind: 'username', username: 'nobody_here', password: 'x' });
    }
    expect(await signIn({ kind: 'username', username: 'nobody_here', password: 'x' })).toEqual({
      ok: false,
      error: 'RATE_LIMITED',
    });
  });
});

describe('signOut', () => {
  it('セッションの行を消す', async () => {
    // Better Auth is loaded outside Vite, so nextCookies writes to the real (absent) request; take
    // the session cookie from the sign-up response instead.
    vi.resetModules();
    const { getAuth } = await import('@/shared/auth/index.server');
    const response = await getAuth().api.signUpEmail({
      body: input('Sample_01'),
      asResponse: true,
    });
    request.headers = new Headers({ cookie: response.headers.get('set-cookie')!.split(';')[0] });
    const [me] = await testDb().select().from(user).where(eq(user.username, 'sample_01'));
    expect(await testDb().select().from(session).where(eq(session.userId, me.id))).toHaveLength(1);
    await (await load()).signOut();
    expect(await testDb().select().from(session).where(eq(session.userId, me.id))).toEqual([]);
  });
});

describe('Better Auth の誤りでない失敗', () => {
  it('データベースが落ちたときなどは、パスワードの誤りにせずに投げ直す', async () => {
    const flows = await load();
    const { getAuth } = await import('@/shared/auth/index.server');
    vi.spyOn(getAuth().api, 'signInUsername').mockRejectedValue(new Error('connection refused'));
    vi.spyOn(getAuth().api, 'signUpEmail').mockRejectedValue(new Error('connection refused'));
    await expect(
      flows.signIn({ kind: 'username', username: 'a_user', password: 'x' }),
    ).rejects.toThrow('connection refused');
    await expect(flows.signUp(input('Sample_09'))).rejects.toThrow('connection refused');
  });
});
