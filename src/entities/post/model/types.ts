import type { UserSummary } from '@/entities/user/@x/post';

/** The post DTO of every list (docs/architecture/application-structure.md 5). IDs are strings. */
export type Post = {
  id: string;
  author: UserSummary;
  text: string;
  createdAt: string;
  media: { url: string; width: number; height: number; alt: string }[];
  counts: { replies: number; reposts: number; likes: number; bookmarks: number; views: number };
  viewer: { liked: boolean; reposted: boolean; bookmarked: boolean };
  repostedBy: UserSummary | null;
  replyTo: { username: string } | null;
  quoted: Post | null;
};

export type PostPage = { items: Post[]; nextCursor: string | null };

export type TimelineKind = 'following' | 'for-you';
