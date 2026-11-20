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
          ? (first) => (
              // A timeline's first page always says where it starts (newestId): the top row's
              // own ID, which for a repost is newer than the post shown (#28 review 1).
              <NewPostsButton since={first.newestId!} queryKey={timelineKey(kind)} />
            )
          : undefined
      }
      {...props}
    />
  );
}
