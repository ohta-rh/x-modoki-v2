// Fictional seed data for local development (#16). Deterministic, and it never touches a database
// that already has users, so rerunning `pnpm db:seed` keeps whatever was made by hand.
import { hashPassword } from 'better-auth/crypto';
import { count, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../src/shared/db/schema/index.ts';
import { newId } from '../src/shared/lib/id/id.ts';

const { account, follows, likes, posts, user } = schema;
type Db = NodePgDatabase<typeof schema>;

const USERS = 20;
const POSTS = 300;
const FOLLOWS_EACH = 5;
const START = Date.UTC(2026, 9, 1); // posts are one minute apart from here

/** The seed people's password: a fixed, published development value (ADR-0068). */
export const SEED_PASSWORD = 'sample-password';

const pad = (n: number) => String(n).padStart(2, '0');

export async function seed(db: Db, log: (line: string) => void = console.log): Promise<void> {
  const [{ n }] = await db.select({ n: count() }).from(user);
  if (n > 0) {
    log('seed: the database already has users; nothing inserted');
    return;
  }
  const users = Array.from({ length: USERS }, (_, i) => ({
    id: `seed-user-${pad(i + 1)}`,
    email: `sample${pad(i + 1)}@example.test`,
    name: `サンプル ${pad(i + 1)}`,
    username: `sample${pad(i + 1)}`,
    displayUsername: `sample${pad(i + 1)}`,
  }));
  const postRows = Array.from({ length: POSTS }, (_, i) => {
    const at = START + i * 60_000;
    return {
      id: newId({ now: at, random: i }),
      authorId: users[i % USERS].id,
      text: `サンプルの投稿 ${i + 1}`,
      createdAt: new Date(at),
    };
  });
  const followRows = users.flatMap((_, i) =>
    Array.from({ length: FOLLOWS_EACH }, (_, k) => ({
      followerId: users[i].id,
      followeeId: users[(i + k + 1) % USERS].id,
    })),
  );
  const likeRows = postRows.flatMap((post, i) =>
    Array.from({ length: i % 4 }, (_, k) => ({
      userId: users[(i + k + 1) % USERS].id,
      postId: post.id,
    })),
  );

  // One hash for all: Better Auth's own scrypt, so its sign-in checks it (#35).
  const password = await hashPassword(SEED_PASSWORD);
  const accountRows = users.map((person) => ({
    id: `seed-account-${person.username}`,
    userId: person.id,
    accountId: person.id,
    providerId: 'credential',
    password,
  }));

  await db.transaction(async (tx) => {
    await tx.insert(user).values(users);
    await tx.insert(account).values(accountRows);
    await tx.insert(posts).values(postRows);
    await tx.insert(follows).values(followRows);
    await tx.insert(likes).values(likeRows);
    await tx.execute(
      sql`UPDATE posts p SET like_count = (SELECT count(*) FROM likes l WHERE l.post_id = p.id)`,
    );
    await tx.execute(sql`UPDATE users u SET
      posts_count = (SELECT count(*) FROM posts p WHERE p.author_id = u.id),
      followers_count = (SELECT count(*) FROM follows f WHERE f.followee_id = u.id),
      following_count = (SELECT count(*) FROM follows f WHERE f.follower_id = u.id)`);
  });
  log(
    `seed: ${users.length} users, ${postRows.length} posts, ${followRows.length} follows, ${likeRows.length} likes`,
  );
}
