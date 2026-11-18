'use client';

import type { PostPage, TimelineKind } from '@/entities/post';
import { PostFeed, type PostFeedProps } from './post-feed';

export const timelineKey = (kind: TimelineKind) => ['timeline', kind] as const;

export type TimelineFeedProps = {
  kind: TimelineKind;
  firstPage: PostPage;
  now: string;
} & Pick<PostFeedProps, 'deleteAction' | 'likeAction' | 'bookmarkAction'>;

/** A home timeline (docs/architecture/ui-ux.md 6): おすすめ or フォロー中. */
export function TimelineFeed({ kind, ...props }: TimelineFeedProps) {
  return <PostFeed queryKey={timelineKey(kind)} endpoint={`/api/timeline/${kind}`} {...props} />;
}
