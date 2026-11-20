import { makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { media } from '@/shared/db';
import { requestUpload } from './request-upload';

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

describe('requestUpload（#25、T-08）', () => {
  // AUTHZ: requestUpload UNAUTHORIZED
  it('ログインが無ければ UNAUTHORIZED で、行を作らない（#33）', async () => {
    expect(
      await requestUpload({ contentType: 'image/webp', contentLength: 10, width: 3, height: 4 }),
    ).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    expect(await testDb().select().from(media)).toHaveLength(0);
  });

  // AUTHZ: requestUpload SELF
  it('media に、自分の pending の行を、推測できないキーと申告の種類・縦横で作る', async () => {
    const me = await makeUser();
    signInAs(me);
    const result = await requestUpload({
      contentType: 'image/webp',
      contentLength: 10,
      width: 3,
      height: 4,
    });
    if (!result.ok) throw new Error(result.error);
    const [row] = await testDb().select().from(media);
    expect(row).toMatchObject({
      ownerId: me.id,
      mime: 'image/webp',
      width: 3,
      height: 4,
      status: 'pending',
    });
    expect(row.id.toString()).toBe(result.id);
    expect(row.key).toMatch(/^media\/[0-9a-f-]{36}\.webp$/);
    expect(result.url).toContain(row.key);
  });
});
