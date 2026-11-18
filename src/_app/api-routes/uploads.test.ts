import { makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { postUploadPresign } from './uploads';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(() => {
  signOut();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-18T12:00:10Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

const post = (body: unknown) =>
  postUploadPresign(
    new Request('http://localhost:3000/api/uploads/presign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
const ok = { contentType: 'image/webp', contentLength: 1234, width: 300, height: 200 };

describe('POST /api/uploads/presign（#25、T-07・T-08）', () => {
  it('60 秒の署名つき URL と推測できないキーと、media の ID を返す', async () => {
    signInAs(await makeUser());
    const response = await post(ok);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toMatch(/X-Amz-Expires=60/);
    expect(body.id).toMatch(/^\d+$/);
    expect(body.url).toMatch(/media\/[0-9a-f-]{36}\.webp\?/);
    const second = await (await post(ok)).json();
    expect(second.id).not.toBe(body.id);
  });

  it('ログイン無しは 401、種類・大きさ・縦横が違えば 400、1 分に 31 回目は 429', async () => {
    expect((await post(ok)).status).toBe(401);
    signInAs(await makeUser());
    for (const bad of [
      { ...ok, contentType: 'image/png' },
      { ...ok, contentType: 'text/html' },
      { ...ok, contentLength: 5 * 1024 * 1024 + 1 },
      { ...ok, contentLength: 0 },
      { ...ok, width: 0 },
      { ...ok, width: 4097 },
      'not json',
    ]) {
      expect((await post(bad)).status).toBe(400);
    }
    const broken = await postUploadPresign(
      new Request('http://localhost:3000/api/uploads/presign', {
        method: 'POST',
        body: '{not json',
      }),
    );
    expect(broken.status).toBe(400);
    expect((await post({ ...ok, contentType: 'image/gif' })).status).toBe(200);
    // JPEG where the browser cannot write WebP (Safari, ADR-0043).
    const jpeg = await post({ ...ok, contentType: 'image/jpeg' });
    expect(jpeg.status).toBe(200);
    expect((await jpeg.json()).url).toMatch(/\.jpg\?/);
    for (let i = 0; i < 28; i++) await post(ok);
    expect((await post(ok)).status).toBe(429);
  });
});
