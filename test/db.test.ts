import { count } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { user } from '@/shared/db/schema';
import { testDb, setupTestDb } from './db';
import { workerDatabaseName } from './db-names';
import { makeUser } from './factories';

setupTestDb();

const users = async () => (await testDb().select({ n: count() }).from(user))[0].n;

describe('テストのデータベース（ADR-0031）', () => {
  it('1 つ目のテストで作った人は、そのテストの中では見える', async () => {
    await makeUser();
    expect(await users()).toBe(1);
  });

  it('次のテストからは見えない（テストの前に表を空にする）', async () => {
    expect(await users()).toBe(0);
  });

  it('ワーカーごとに別のデータベースを使う', async () => {
    const { rows } = await testDb().execute<{ db: string }>('SELECT current_database() AS db');
    expect(rows[0].db).toBe(workerDatabaseName(process.env.VITEST_POOL_ID ?? '1'));
  });
});
