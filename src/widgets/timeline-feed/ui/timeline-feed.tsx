'use client';

import type { PostPage, TimelineKind } from '@/entities/post';
import { NewPostsButton } from '@/features/timeline-new-posts';
import { PostFeed, type PostFeedProps } from './post-feed';

export const timelineKey = (kind: TimelineKind) => ['timeline', kind] as const;

export type TimelineFeedProps = {
  kind: TimelineKind;
  firstPage: PostPage;
  now: string;
} & Pick<
  PostFeedProps,
  'deleteAction' | 'likeAction' | 'bookmarkAction' | 'repostAction' | 'quoteAction'
>;

/**
 * A home timeline (docs/architecture/ui-ux.md 6): おすすめ or フォロー中. フォロー中 tells of newer
 * posts by the people followed (#28).
 */
export function TimelineFeed({ kind, ...props }: TimelineFeedProps) {
  return (
    <PostFeed
      queryKey={timelineKey(kind)}
      endpoint={`/api/timeline/${kind}`}
      top={
        kind === 'following'
          ? (posts) => <NewPostsButton since={posts[0].id} queryKey={timelineKey(kind)} />
          : undefined
      }
      {...props}
    />
  );
}
