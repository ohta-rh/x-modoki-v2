import 'server-only';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { alias } from 'drizzle-orm/pg-core';
import { getDb, posts, user } from '@/shared/db';
import { toIdString } from '@/shared/lib/id';
import { mediaUrl } from '@/shared/lib/media-url';
import { findLinks } from '@/shared/lib/text-parse';
import type { Post, QuotedPost } from '../model/types';

const FALSE = sql<boolean>`false`;

/** `posts`, or the alias the timeline reads a row's shown post through. */
type PostTable = typeof posts | ReturnType<typeof alias<typeof posts, 'shown'>>;

/**
 * The columns every post list selects (join `user` on the author). The viewer's own state, the
 * images and the quoted post come from sub-queries in the same statement — never one query per
 * post (#32). `t` is `posts` or an alias of it.
 */
export function postColumns(viewerId: string | null, t: PostTable = posts) {
  const viewer = (query: ReturnType<typeof sql>) =>
    viewerId ? sql<boolean>`exists (${query})` : FALSE;
  return {
    post: t,
    author: { username: user.username, name: user.name, image: user.image },
    replyToUsername: sql<
      string | null
    >`(select pu.username from posts pp join users pu on pu.id = pp.author_id where pp.id = ${t.replyToId})`,
    liked: viewer(sql`select 1 from likes l where l.post_id = ${t.id} and l.user_id = ${viewerId}`),
    bookmarked: viewer(
      sql`select 1 from bookmarks b where b.post_id = ${t.id} and b.user_id = ${viewerId}`,
    ),
    reposted: viewer(
      sql`select 1 from posts r where r.repost_of_id = ${t.id} and r.author_id = ${viewerId}`,
    ),
    images: sql<
      Image[]
    >`(select coalesce(json_agg(json_build_object('key', m.key, 'width', m.width, 'height', m.height, 'alt', m.alt) order by pm.position), '[]'::json) from post_media pm join media m on m.id = pm.media_id where pm.post_id = ${t.id})`,
    quoted: sql<QuotedJson | null>`(select json_build_object('id', q.id::text, 'deleted', q.deleted_at is not null, 'text', q.text, 'createdAt', q.created_at, 'quotesAnother', q.quote_of_id is not null, 'username', qu.username, 'name', qu.name, 'image', qu.image) from posts q join users qu on qu.id = q.author_id where q.id = ${t.quoteOfId})`,
  };
}

type Image = { key: string; width: number; height: number; alt: string };

/** The quoted post as the statement returns it: IDs as text, so no 64-bit ID loses digits. */
type QuotedJson = {
  id: string;
  deleted: boolean;
  text: string;
  createdAt: string;
  quotesAnother: boolean;
  username: string | null;
  name: string;
  image: string | null;
};

export type Row = {
  post: typeof posts.$inferSelect;
  author: { username: string | null; name: string; image: string | null };
  replyToUsername: string | null;
  liked: boolean;
  bookmarked: boolean;
  reposted: boolean;
  images: Image[];
  quoted: QuotedJson | null;
};

const summary = (author: Row['author']) => ({
  username: author.username!,
  name: author.name,
  avatarUrl: mediaUrl(author.image),
});

function toQuoted(quoted: QuotedJson): QuotedPost {
  if (quoted.deleted) return { id: quoted.id, deleted: true };
  return {
    id: quoted.id,
    author: summary(quoted),
    text: quoted.text,
    links: findLinks(quoted.text),
    createdAt: new Date(quoted.createdAt).toISOString(),
    quotesAnother: quoted.quotesAnother,
  };
}

/** One row as the post DTO (application-structure.md 5). */
export function toPost(row: Row, viewerId: string | null, repostedBy: Post['repostedBy']): Post {
  const { post, author } = row;
  return {
    id: toIdString(post.id),
    author: summary(author),
    text: post.text,
    links: findLinks(post.text),
    createdAt: post.createdAt.toISOString(),
    media: row.images.map(({ key, width, height, alt }) => ({
      url: mediaUrl(key)!,
      width,
      height,
      alt,
    })),
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
    repostedBy,
    replyTo: row.replyToUsername ? { username: row.replyToUsername } : null,
    quoted: row.quoted ? toQuoted(row.quoted) : null,
  };
}

/** Who reposted a row, or null; `reposter` is the row's own author when the row is a repost. */
export const toRepostedBy = (reposter: Row['author'] | null) =>
  reposter?.username ? summary(reposter) : null;

/**
 * Rows of a list as post DTOs (#22). A repost row shows its original with `repostedBy`; a repost
 * of a deleted original is dropped. The originals are read in one query for the whole page, sent
 * only when the page holds a repost (data-model.md 4) — never one query per post.
 */
export async function toPosts(rows: Row[], viewerId: string | null): Promise<Post[]> {
  const repostOf = rows.flatMap((row) =>
    row.post.repostOfId === null ? [] : [row.post.repostOfId],
  );
  const originals = repostOf.length
    ? await getDb()
        .select(postColumns(viewerId))
        .from(posts)
        .innerJoin(user, eq(user.id, posts.authorId))
        .where(and(inArray(posts.id, repostOf), isNull(posts.deletedAt)))
    : [];
  const originalById = new Map(originals.map((row) => [row.post.id, row]));
  return rows.flatMap((row): Post[] => {
    if (row.post.repostOfId === null) return [toPost(row, viewerId, null)];
    const original = originalById.get(row.post.repostOfId);
    return original ? [toPost(original, viewerId, summary(row.author))] : [];
  });
}
