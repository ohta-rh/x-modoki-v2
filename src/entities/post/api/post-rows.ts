import 'server-only';
import { sql } from 'drizzle-orm';
import { posts, user } from '@/shared/db';
import { toIdString } from '@/shared/lib/id';
import { mediaUrl } from '@/shared/lib/media-url';
import type { Post } from '../model/types';

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

type Row = {
  post: typeof posts.$inferSelect;
  author: { username: string | null; name: string; image: string | null };
  replyToUsername: string | null;
  liked: boolean;
  bookmarked: boolean;
  reposted: boolean;
};

/** One row as the post DTO (application-structure.md 5). */
export function toPost(row: Row, viewerId: string | null): Post {
  const { post, author } = row;
  return {
    id: toIdString(post.id),
    author: { username: author.username!, name: author.name, avatarUrl: mediaUrl(author.image) },
    text: post.text,
    createdAt: post.createdAt.toISOString(),
    media: [],
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
    repostedBy: null,
    replyTo: row.replyToUsername ? { username: row.replyToUsername } : null,
    quoted: null,
  };
}
