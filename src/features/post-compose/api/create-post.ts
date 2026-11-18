import 'server-only';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import twitterText from 'twitter-text';
import { checkUploads } from '@/entities/media/index.server';
import { hitRateLimit } from '@/shared/api/index.server';
import { getSession } from '@/shared/auth/index.server';
import {
  getDb,
  hashtags,
  media,
  mentions,
  postHashtags,
  postMedia,
  posts,
  user,
} from '@/shared/db';
import { newId as defaultNewId, toIdString } from '@/shared/lib/id';
import { measurePost } from '@/shared/lib/text';

export type CreatePostResult =
  | { ok: true; id: string }
  | { ok: false; error: 'UNAUTHORIZED' | 'VALIDATION' | 'RATE_LIMITED' | 'NOT_FOUND' };

/** An uploaded image to attach, with its alternative text (#25). */
export type MediaItem = { id: bigint; alt: string };

type Options = {
  newId?: () => bigint;
  replyToId?: bigint;
  quoteOfId?: bigint;
  media?: MediaItem[];
};

const MAX_MEDIA = 4;
const MAX_ALT = 1000;

const unique = (values: string[]) => [...new Set(values.map((value) => value.toLowerCase()))];

const isIdCollision = (error: unknown) =>
  (error as { cause?: { code?: string; constraint?: string } })?.cause?.code === '23505' &&
  (error as { cause: { constraint?: string } }).cause.constraint === 'posts_pkey';

/** A refusal decided inside the transaction; throwing it rolls the transaction back. */
class Refused extends Error {
  constructor(readonly reason: 'NOT_FOUND' | 'VALIDATION') {
    super(reason);
  }
}

/**
 * Creates a post — text, a reply (#20), a quote (#22), up to four checked images (#25) — and, in the
 * same transaction, its hashtags, mentions, images and the author's post count (FR-POST,
 * data-model.md). 10 posts per user per minute (NFR-SEC-05).
 */
export async function createPost(
  text: string,
  { newId = defaultNewId, replyToId, quoteOfId, media: items = [] }: Options = {},
): Promise<CreatePostResult> {
  const viewer = await getSession();
  if (!viewer) return { ok: false, error: 'UNAUTHORIZED' };
  const body = text.normalize('NFC');
  // A post may be images alone (#25); otherwise its text must be postable.
  const textOk = measurePost(body).postable || (body === '' && items.length > 0);
  const mediaOk = items.length <= MAX_MEDIA && items.every((item) => item.alt.length <= MAX_ALT);
  if (!textOk || !mediaOk) return { ok: false, error: 'VALIDATION' };
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
  const mediaIds = items.map((item) => item.id);
  if (items.length > 0 && !(await checkUploads(viewer.id, mediaIds))) {
    return { ok: false, error: 'VALIDATION' };
  }
  const tags = unique(twitterText.extractHashtags(body));
  const names = unique(twitterText.extractMentions(body));

  // A refusal inside the transaction throws, so everything it wrote — a claimed image above all —
  // is rolled back; returning would commit it (#25 review 1).
  const insert = async (id: bigint) =>
    getDb()
      .transaction(async (tx): Promise<bigint> => {
        // The images go first: only a still-pending one is claimed, so two posts never share one.
        const claimed =
          items.length === 0
            ? []
            : await tx
                .update(media)
                .set({ status: 'ready' })
                .where(and(inArray(media.id, mediaIds), eq(media.status, 'pending')))
                .returning({ id: media.id });
        if (claimed.length !== items.length) throw new Refused('VALIDATION');
        // The parent's count goes first and re-checks deleted_at: a parent deleted after the check
        // above takes no reply.
        if (parent) {
          const counted = await tx
            .update(posts)
            .set({ replyCount: sql`${posts.replyCount} + 1` })
            .where(and(eq(posts.id, parent.id), isNull(posts.deletedAt)))
            .returning({ id: posts.id });
          if (counted.length === 0) throw new Refused('NOT_FOUND');
        }
        if (quoted !== undefined) {
          const counted = await tx
            .update(posts)
            .set({ quoteCount: sql`${posts.quoteCount} + 1` })
            .where(and(eq(posts.id, quoted), isNull(posts.deletedAt)))
            .returning({ id: posts.id });
          if (counted.length === 0) throw new Refused('NOT_FOUND');
        }
        await tx.insert(posts).values({
          id,
          authorId: viewer.id,
          text: body,
          replyToId: parent?.id ?? null,
          rootId: parent ? (parent.rootId ?? parent.id) : null,
          quoteOfId: quoted ?? null,
        });
        for (const [position, item] of items.entries()) {
          await tx.update(media).set({ alt: item.alt }).where(eq(media.id, item.id));
          await tx.insert(postMedia).values({ postId: id, mediaId: item.id, position });
        }
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
      })
      .catch((error: unknown) => (error instanceof Refused ? error.reason : Promise.reject(error)));

  const created = (id: bigint | 'NOT_FOUND' | 'VALIDATION'): CreatePostResult =>
    typeof id === 'string' ? { ok: false, error: id } : { ok: true, id: toIdString(id) };
  try {
    return created(await insert(newId()));
  } catch (error) {
    if (!isIdCollision(error)) throw error;
    return created(await insert(newId()));
  }
}
