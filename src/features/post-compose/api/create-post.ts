import 'server-only';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import twitterText from 'twitter-text';
import { hitRateLimit } from '@/shared/api/index.server';
import { getSession } from '@/shared/auth/index.server';
import { getDb, hashtags, mentions, postHashtags, posts, user } from '@/shared/db';
import { newId as defaultNewId, toIdString } from '@/shared/lib/id';
import { measurePost } from '@/shared/lib/text';

export type CreatePostResult =
  | { ok: true; id: string }
  | { ok: false; error: 'UNAUTHORIZED' | 'VALIDATION' | 'RATE_LIMITED' | 'NOT_FOUND' };

type Options = { newId?: () => bigint; replyToId?: bigint; quoteOfId?: bigint };

const unique = (values: string[]) => [...new Set(values.map((value) => value.toLowerCase()))];

const isIdCollision = (error: unknown) =>
  (error as { cause?: { code?: string; constraint?: string } })?.cause?.code === '23505' &&
  (error as { cause: { constraint?: string } }).cause.constraint === 'posts_pkey';

/**
 * Creates a text post (or a reply, with replyToId: #20) and, in the same transaction, its hashtags and mentions and the author's
 * post count (FR-POST, data-model.md). 10 posts per user per minute (NFR-SEC-05).
 */
export async function createPost(
  text: string,
  { newId = defaultNewId, replyToId, quoteOfId }: Options = {},
): Promise<CreatePostResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  const body = text.normalize('NFC');
  if (!measurePost(body).postable) return { ok: false, error: 'VALIDATION' };
  if (!(await hitRateLimit(`post:${viewer.id}`, { limit: 10, windowMs: 60_000 }))) {
    return { ok: false, error: 'RATE_LIMITED' };
  }
  let parent: { id: bigint; rootId: bigint | null } | undefined;
  if (replyToId !== undefined) {
    [parent] = await getDb()
      .select({ id: posts.id, rootId: posts.rootId })
      .from(posts)
      .where(and(eq(posts.id, replyToId), isNull(posts.deletedAt)));
    if (!parent) return { ok: false, error: 'NOT_FOUND' };
  }
  // A quote of a repost quotes the original (#22).
  let quoted: bigint | undefined;
  if (quoteOfId !== undefined) {
    const [target] = await getDb()
      .select({ id: posts.id, repostOfId: posts.repostOfId })
      .from(posts)
      .where(and(eq(posts.id, quoteOfId), isNull(posts.deletedAt)));
    if (!target) return { ok: false, error: 'NOT_FOUND' };
    quoted = target.repostOfId ?? target.id;
  }
  const tags = unique(twitterText.extractHashtags(body));
  const names = unique(twitterText.extractMentions(body));

  const insert = async (id: bigint) =>
    getDb().transaction(async (tx): Promise<bigint | null> => {
      // The parent's count goes first and re-checks deleted_at: a parent deleted after the check
      // above takes no reply (nothing has been written yet when this returns).
      if (parent) {
        const counted = await tx
          .update(posts)
          .set({ replyCount: sql`${posts.replyCount} + 1` })
          .where(and(eq(posts.id, parent.id), isNull(posts.deletedAt)))
          .returning({ id: posts.id });
        if (counted.length === 0) return null;
      }
      if (quoted !== undefined) {
        const counted = await tx
          .update(posts)
          .set({ quoteCount: sql`${posts.quoteCount} + 1` })
          .where(and(eq(posts.id, quoted), isNull(posts.deletedAt)))
          .returning({ id: posts.id });
        if (counted.length === 0) return null;
      }
      await tx.insert(posts).values({
        id,
        authorId: viewer.id,
        text: body,
        replyToId: parent?.id ?? null,
        rootId: parent ? (parent.rootId ?? parent.id) : null,
        quoteOfId: quoted ?? null,
      });
      if (tags.length > 0) {
        await tx
          .insert(hashtags)
          .values(tags.map((tag) => ({ id: newId(), tag })))
          .onConflictDoNothing({ target: hashtags.tag });
        const rows = await tx
          .select({ id: hashtags.id })
          .from(hashtags)
          .where(inArray(hashtags.tag, tags));
        await tx
          .insert(postHashtags)
          .values(rows.map((row) => ({ postId: id, hashtagId: row.id })));
      }
      if (names.length > 0) {
        const people = await tx
          .select({ id: user.id })
          .from(user)
          .where(inArray(sql`lower(${user.username})`, names));
        if (people.length > 0) {
          await tx
            .insert(mentions)
            .values(people.map((person) => ({ postId: id, userId: person.id })));
        }
      }
      await tx
        .update(user)
        .set({ postsCount: sql`${user.postsCount} + 1` })
        .where(eq(user.id, viewer.id));
      return id;
    });

  const created = (id: bigint | null): CreatePostResult =>
    id === null ? { ok: false, error: 'NOT_FOUND' } : { ok: true, id: toIdString(id) };
  try {
    return created(await insert(newId()));
  } catch (error) {
    if (!isIdCollision(error)) throw error;
    return created(await insert(newId()));
  }
}
