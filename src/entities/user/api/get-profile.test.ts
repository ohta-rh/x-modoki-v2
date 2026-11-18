import { makeUser } from '@test/factories';
import { setupTestDb } from '@test/db';
import { currentSession, signInAs, signOut } from '@test/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProfile } from './get-profile';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

describe('getProfile（#23、ui-ux.md の 8 節）', () => {
  it('プロフィールの DTO を返す（メールアドレスや内部の列は出さない）。ログインは要らない', async () => {
    await makeUser({
      username: 'hanako',
      name: '花子',
      bio: '猫が好き',
      location: '東京',
      website: 'https://example.com',
      followersCount: 3,
      followingCount: 2,
      postsCount: 5,
      createdAt: new Date('2025-04-01T00:00:00Z'),
    });
    const result = await getProfile('hanako');
    expect(result).toEqual({
      ok: true,
      profile: {
        username: 'hanako',
        name: '花子',
        avatarUrl: null,
        bannerUrl: null,
        bio: '猫が好き',
        location: '東京',
        website: 'https://example.com',
        joinedAt: '2025-04-01T00:00:00.000Z',
        followersCount: 3,
        followingCount: 2,
        postsCount: 5,
        isSelf: false,
      },
    });
  });

  it('大文字と小文字を区別しない。本人なら isSelf。無いユーザー名は NOT_FOUND', async () => {
    const me = await makeUser({ username: 'taro' });
    signInAs(me);
    const result = await getProfile('TARO');
    expect(result.ok && result.profile.isSelf).toBe(true);
    expect(await getProfile('nobody')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
