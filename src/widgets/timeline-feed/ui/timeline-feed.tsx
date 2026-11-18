'use client';

import type { PostPage, TimelineKind } from '@/entities/post';
import type { DeletePostActionResult } from '@/features/post-delete';
import { PostFeed } from './post-feed';

export const timelineKey = (kind: TimelineKind) => ['timeline', kind] as const;

type Props = {
  kind: TimelineKind;
  firstPage: PostPage;
  now: string;
  deleteAction?: (postId: string) => Promise<DeletePostActionResult>;
};

/** A home timeline (docs/architecture/ui-ux.md 6): おすすめ or フォロー中. */
export function TimelineFeed({ kind, firstPage, now, deleteAction }: Props) {
  return (
    <PostFeed
      queryKey={timelineKey(kind)}
      endpoint={`/api/timeline/${kind}`}
      firstPage={firstPage}
      now={now}
      deleteAction={deleteAction}
    />
  );
}
