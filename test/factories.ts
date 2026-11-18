// Test data builders (ADR-0031). Each call makes a fresh, unique row; pass only what the test is about.
import { newId } from '@/shared/lib/id';
import { follows, likes, posts, user } from '@/shared/db/schema';
import { testDb } from './db';

let sequence = 0;
const next = () => `${process.env.VITEST_POOL_ID ?? '1'}x${(sequence += 1)}`;

export async function makeUser(overrides: Partial<typeof user.$inferInsert> = {}) {
  const n = next();
  const [row] = await testDb()
    .insert(user)
    .values({
      id: `user-${n}`,
      email: `user-${n}@example.test`,
      name: `テストの人 ${n}`,
      username: `t${n}`.slice(0, 15),
      displayUsername: `t${n}`.slice(0, 15),
      ...overrides,
    })
    .returning();
  return row;
}

export async function makePost(
  overrides: Partial<typeof posts.$inferInsert> & { authorId: string },
) {
  const [row] = await testDb()
    .insert(posts)
    .values({ id: newId(), text: `テストの投稿 ${next()}`, ...overrides })
    .returning();
  return row;
}

export async function makeFollow(followerId: string, followeeId: string) {
  await testDb().insert(follows).values({ followerId, followeeId });
}

export async function makeLike(userId: string, postId: bigint) {
  await testDb().insert(likes).values({ userId, postId });
}
