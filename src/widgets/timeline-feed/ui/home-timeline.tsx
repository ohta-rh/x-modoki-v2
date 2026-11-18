'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { PostPage, TimelineKind } from '@/entities/post';
import { ComposeBox, type CreatePostActionResult } from '@/features/post-compose';
import { TimelineFeed, timelineKey } from './timeline-feed';

type Props = {
  kind: TimelineKind;
  firstPage: PostPage;
  now: string;
  action: (text: string) => Promise<CreatePostActionResult>;
};

/** The composer above the timeline; a new post reloads the first page so it appears on top. */
export function HomeTimeline({ kind, firstPage, now, action }: Props) {
  const queryClient = useQueryClient();
  return (
    <>
      <ComposeBox
        action={action}
        onPosted={() => void queryClient.resetQueries({ queryKey: timelineKey(kind) })}
      />
      <TimelineFeed kind={kind} firstPage={firstPage} now={now} />
    </>
  );
}
