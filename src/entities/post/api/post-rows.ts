import 'server-only';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { getDb, media, postMedia, posts, user } from '@/shared/db';
import { toIdString } from '@/shared/lib/id';
import { mediaUrl } from '@/shared/lib/media-url';
import type { Post, QuotedPost } from '../model/types';

const FALSE = sql<boolean>`false`;

/**
 * The columns every post list selects (join `user` on the author). The viewer's own state comes
 * from EXISTS sub-queries in the same statement — never one query per post.
 */
export function postColumns(viewerId: string | null) {
  const viewer = (query: ReturnType<typeof sql>) =>
    viewerId ? sql<boolean>`exists (${query})` : FALSE;
  return {
    post: posts,
    author: { username: user.username, name: user.name, image: user.image },
    replyToUsername: sql<
      string | null
    >`(select pu.username from posts pp join users pu on pu.id = pp.author_id where pp.id = ${posts.replyToId})`,
    liked: viewer(
      sql`select 1 from likes l where l.post_id = ${posts.id} and l.user_id = ${viewerId}`,
    ),
    bookmarked: viewer(
      sql`select 1 from bookmarks b where b.post_id = ${posts.id} and b.user_id = ${viewerId}`,
    ),
    reposted: viewer(
      sql`select 1 from posts r where r.repost_of_id = ${posts.id} and r.author_id = ${viewerId}`,
    ),
  };
}

export type Row = {
  post: typeof posts.$inferSelect;
  author: { username: string | null; name: string; image: string | null };
  replyToUsername: string | null;
  liked: boolean;
  bookmarked: boolean;
  reposted: boolean;
};

type Extra = { repostedBy: Post['repostedBy']; quoted: QuotedPost | null; media: Post['media'] };

const summary = (author: Row['author']) => ({
  username: author.username!,
  name: author.name,
  avatarUrl: mediaUrl(author.image),
});

/** One row as the post DTO (application-structure.md 5). */
function toPost(row: Row, viewerId: string | null, extra: Extra): Post {
  const { post, author } = row;
  return {
    id: toIdString(post.id),
    author: summary(author),
    text: post.text,
    createdAt: post.createdAt.toISOString(),
    media: extra.media,
    counts: {
      replies: post.replyCount,
      reposts: post.repostCount,
      likes: post.likeCount,
      bookmarks: post.bookmarkCount,
      views: post.viewCount,
    },
    viewer: {
      liked: row.liked,
      reposted: row.reposted,
      bookmarked: row.bookmarked,
      isAuthor: viewerId === post.authorId,
    },
    repostedBy: extra.repostedBy,
    replyTo: row.replyToUsername ? { username: row.replyToUsername } : null,
    quoted: extra.quoted,
  };
}

/**
 * Rows of a list as post DTOs (#22). A repost row shows its original with `repostedBy`; a repost
 * of a deleted original is dropped. Originals and quoted posts are read in one query each for the
 * whole page (data-model.md 4) — never one query per post.
 */
export async function toPosts(rows: Row[], viewerId: string | null): Promise<Post[]> {
  const db = getDb();
  const repostOf = rows.flatMap((row) =>
    row.post.repostOfId === null ? [] : [row.post.repostOfId],
  );
  const originals = await db
    .select(postColumns(viewerId))
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .where(and(inArray(posts.id, repostOf), isNull(posts.deletedAt)));
  const originalById = new Map(originals.map((row) => [row.post.id, row]));
  type Shown = { row: Row; repostedBy: Post['repostedBy'] };
  const shown = rows.flatMap((row): Shown[] => {
    if (row.post.repostOfId === null) return [{ row, repostedBy: null }];
    const original = originalById.get(row.post.repostOfId);
    return original ? [{ row: original, repostedBy: summary(row.author) }] : [];
  });
  const quoteOf = shown.flatMap(({ row }) =>
    row.post.quoteOfId === null ? [] : [row.post.quoteOfId],
  );
  const quotedRows = await db
    .select({
      post: posts,
      author: { username: user.username, name: user.name, image: user.image },
    })
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .where(inArray(posts.id, quoteOf));
  const quotedById = new Map(
    quotedRows.map(({ post, author }): [bigint, QuotedPost] => [
      post.id,
      post.deletedAt
        ? { id: toIdString(post.id), deleted: true }
        : {
            id: toIdString(post.id),
            author: summary(author),
            text: post.text,
            createdAt: post.createdAt.toISOString(),
            quotesAnother: post.quoteOfId !== null,
          },
    ]),
  );
  const images = await db
    .select({
      postId: postMedia.postId,
      key: media.key,
      width: media.width,
      height: media.height,
      alt: media.alt,
    })
    .from(postMedia)
    .innerJoin(media, eq(media.id, postMedia.mediaId))
    .where(
      inArray(
        postMedia.postId,
        shown.map(({ row }) => row.post.id),
      ),
    )
    .orderBy(asc(postMedia.postId), asc(postMedia.position));
  const mediaOf = (id: bigint) =>
    images
      .filter((image) => image.postId === id)
      .map(({ key, width, height, alt }) => ({ url: mediaUrl(key)!, width, height, alt }));
  return shown.map(({ row, repostedBy }) =>
    toPost(row, viewerId, {
      repostedBy,
      quoted: quotedById.get(row.post.quoteOfId!) ?? null,
      media: mediaOf(row.post.id),
    }),
  );
}
