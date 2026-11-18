import { makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { makeUpload, webpHead } from '@test/uploads';
import { currentSession, signInAs, signOut } from '@test/session';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { media, user } from '@/shared/db';
import { sniffImage } from '@/shared/lib/image';
import { readHead } from '@/shared/storage';
import { updateProfileAction } from './actions';

vi.mock('@/shared/auth/index.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/index.server')>()),
  getSession: currentSession,
}));

setupTestDb();
beforeEach(signOut);

const input = { name: '新しい名前', bio: '猫', location: '東京', website: 'https://example.com' };

describe('updateProfileAction（#23）', () => {
  it('自分のプロフィールの 4 つの項目だけを変える', async () => {
    const me = await makeUser({ username: 'hanako' });
    const other = await makeUser();
    signInAs(me);
    expect(await updateProfileAction({ ...input, username: 'stolen' } as typeof input)).toEqual({
      ok: true,
    });
    const [row] = await testDb().select().from(user).where(eq(user.id, me.id));
    expect(row).toMatchObject({ ...input, username: 'hanako' });
    const [untouched] = await testDb().select().from(user).where(eq(user.id, other.id));
    expect(untouched.bio).toBe('');
  });

  it('形の違う入力は項目ごとの文言、ログイン無しはログインするよう言う', async () => {
    signInAs(await makeUser());
    expect(await updateProfileAction({ ...input, website: 'ftp://x' })).toEqual({
      ok: false,
      code: 'VALIDATION',
      fieldErrors: { website: ['http か https の URL を入れてください'] },
    });
    signOut();
    expect(await updateProfileAction(input)).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      fieldErrors: {},
      message: 'ログインしてください',
    });
  });
});

describe('updateProfileAction のアバターとバナー（#25）', () => {
  const upload = (ownerId: string, width: number, height: number) =>
    makeUpload(ownerId, { bytes: webpHead(width, height), width, height });
  const sniffed = async (key: string | null) => sniffImage((await readHead(key!, 1024))!);

  it('400×400 のアバターと 1500×500 のバナーを、確かめた写しに置き換えて保存する', async () => {
    const me = await makeUser();
    signInAs(me);
    const avatar = await upload(me.id, 400, 400);
    const banner = await upload(me.id, 1500, 500);
    expect(
      await updateProfileAction({
        ...input,
        avatarId: avatar.id.toString(),
        bannerId: banner.id.toString(),
      }),
    ).toEqual({ ok: true });
    const [row] = await testDb().select().from(user).where(eq(user.id, me.id));
    expect(row.image).toMatch(/^media\//);
    expect(row.image).not.toBe(avatar.key);
    expect(await sniffed(row.image)).toEqual({ type: 'image/webp', width: 400, height: 400 });
    expect(await sniffed(row.banner)).toEqual({ type: 'image/webp', width: 1500, height: 500 });
    const rows = await testDb().select().from(media);
    expect(rows.every((item) => item.status === 'ready')).toBe(true);
  });

  it('他人の画像・無い画像・大きさの違う画像は保存せず、画像を保存できなかったと言う', async () => {
    const me = await makeUser();
    const other = await makeUser();
    signInAs(me);
    const refused = {
      ok: false,
      code: 'VALIDATION',
      fieldErrors: {},
      message: '画像を保存できませんでした',
    };
    for (const avatarId of [
      (await upload(other.id, 400, 400)).id,
      (await upload(me.id, 300, 200)).id,
      12345n,
    ]) {
      expect(await updateProfileAction({ ...input, avatarId: avatarId.toString() })).toEqual(
        refused,
      );
    }
    expect(
      await updateProfileAction({
        ...input,
        bannerId: (await upload(me.id, 400, 400)).id.toString(),
      }),
    ).toEqual(refused);
    const [row] = await testDb().select().from(user).where(eq(user.id, me.id));
    expect(row).toMatchObject({ image: null, banner: null, name: me.name });
  });

  it('アバターを変えると、前のアバターの画像は消える', async () => {
    const me = await makeUser();
    signInAs(me);
    await updateProfileAction({
      ...input,
      avatarId: (await upload(me.id, 400, 400)).id.toString(),
    });
    const [first] = await testDb().select().from(user).where(eq(user.id, me.id));
    await updateProfileAction({
      ...input,
      avatarId: (await upload(me.id, 400, 400)).id.toString(),
    });
    expect(await readHead(first.image!, 4)).toBeNull();
    expect(await testDb().select().from(media).where(eq(media.key, first.image!))).toEqual([]);
  });

  it('確かめたあと、保存の前に画像がほかで使われたら、保存せず、作った写しも消す', async () => {
    const me = await makeUser();
    signInAs(me);
    const avatar = await upload(me.id, 400, 400);
    const db = testDb();
    const transaction = db.transaction.bind(db);
    vi.spyOn(db, 'transaction').mockImplementationOnce(async (run) => {
      await db.update(media).set({ status: 'ready' }).where(eq(media.id, avatar.id));
      return transaction(run);
    });
    expect(await updateProfileAction({ ...input, avatarId: avatar.id.toString() })).toMatchObject({
      ok: false,
      message: '画像を保存できませんでした',
    });
    const [row] = await testDb().select().from(user).where(eq(user.id, me.id));
    expect(row).toMatchObject({ image: null, name: me.name });
    const [still] = await testDb().select().from(media).where(eq(media.id, avatar.id));
    expect(still.key).toBe(avatar.key);
  });

  it('保存の途中の思いがけない失敗は、握りつぶさずに投げる', async () => {
    const me = await makeUser();
    signInAs(me);
    const avatar = await upload(me.id, 400, 400);
    vi.spyOn(testDb(), 'transaction').mockRejectedValueOnce(new Error('connection lost'));
    await expect(updateProfileAction({ ...input, avatarId: avatar.id.toString() })).rejects.toThrow(
      'connection lost',
    );
  });

  it('前のアバターが他人の画像を指していても、他人の行と画像は消さない（レビュー 2）', async () => {
    const me = await makeUser();
    const victim = await makeUser();
    const theirs = await upload(victim.id, 400, 400);
    await testDb().update(media).set({ status: 'ready' }).where(eq(media.id, theirs.id));
    // As if the image column were set to someone else's key behind the editor's back.
    await testDb().update(user).set({ image: theirs.key }).where(eq(user.id, me.id));
    signInAs(me);
    expect(
      await updateProfileAction({
        ...input,
        avatarId: (await upload(me.id, 400, 400)).id.toString(),
      }),
    ).toEqual({ ok: true });
    expect(await testDb().select().from(media).where(eq(media.id, theirs.id))).toHaveLength(1);
    expect(await readHead(theirs.key, 4)).not.toBeNull();
  });
});
