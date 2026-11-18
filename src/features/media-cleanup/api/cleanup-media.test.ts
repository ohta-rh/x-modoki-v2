import { makeUser } from '@test/factories';
import { setupTestDb, testDb } from '@test/db';
import { makeUpload } from '@test/uploads';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { media } from '@/shared/db';
import { readHead } from '@/shared/storage';
import { cleanupMedia } from './cleanup-media';

setupTestDb();

const NOW = new Date('2026-11-18T12:00:00.000Z');
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3600_000);

describe('cleanupMedia（#25、結びつかなかった画像）', () => {
  it('24 時間より古い pending の行とその画像を消し、新しい pending と ready は残す', async () => {
    const me = await makeUser();
    const old = await makeUpload(me.id);
    const fresh = await makeUpload(me.id);
    const used = await makeUpload(me.id);
    await testDb()
      .update(media)
      .set({ createdAt: hoursAgo(25) })
      .where(eq(media.id, old.id));
    await testDb()
      .update(media)
      .set({ createdAt: hoursAgo(23) })
      .where(eq(media.id, fresh.id));
    await testDb()
      .update(media)
      .set({ createdAt: hoursAgo(48), status: 'ready' })
      .where(eq(media.id, used.id));

    expect(await cleanupMedia(NOW)).toEqual({ removed: 1 });
    const left = (await testDb().select({ id: media.id }).from(media)).map((row) => row.id);
    expect(left.sort()).toEqual([fresh.id, used.id].sort());
    expect(await readHead(old.key, 4)).toBeNull();
    expect(await readHead(fresh.key, 4)).not.toBeNull();
  });

  it('画像が置かれなかった行も消す', async () => {
    const me = await makeUser();
    const never = await makeUpload(me.id, { put: false });
    await testDb()
      .update(media)
      .set({ createdAt: hoursAgo(30) })
      .where(eq(media.id, never.id));
    expect(await cleanupMedia(NOW)).toEqual({ removed: 1 });
    expect(await testDb().select().from(media)).toEqual([]);
  });
});
