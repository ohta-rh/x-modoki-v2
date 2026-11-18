import type { UserSummary } from '@/entities/user/@x/post';

/** The post DTO of every list (docs/architecture/application-structure.md 5). IDs are strings. */
export type Post = {
  id: string;
  author: UserSummary;
  text: string;
  createdAt: string;
  media: { url: string; width: number; height: number; alt: string }[];
  counts: { replies: number; reposts: number; likes: number; bookmarks: number; views: number };
  viewer: { liked: boolean; reposted: boolean; bookmarked: boolean; isAuthor: boolean };
  repostedBy: UserSummary | null;
  replyTo: { username: string } | null;
  quoted: QuotedPost | null;
  /** Shown first on its author's profile with 「固定」 (#23); absent elsewhere. */
  pinned?: true;
};

/**
 * The post inside a quote (#22): one level only, so its own quote is just `quotesAnother` (shown as
 * a 「ポストを表示」 link); a deleted one is only a mark.
 */
export type QuotedPost =
  | { id: string; author: UserSummary; text: string; createdAt: string; quotesAnother: boolean }
  | { id: string; deleted: true };

export type PostPage = { items: Post[]; nextCursor: string | null };

export type TimelineKind = 'following' | 'for-you';

/** The tabs of a profile (#23, ui-ux.md 8). */
export type UserPostsTab = 'posts' | 'with_replies' | 'media' | 'likes';

/** A post above the one being read: a post, or only a mark when it was deleted. */
export type ThreadItem = Post | { id: string; deleted: true };

export type PostDetail = { post: Post; ancestors: ThreadItem[]; replies: PostPage };
