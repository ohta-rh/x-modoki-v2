'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ComposeBox, type CreatePostActionResult } from '@/features/post-compose';
import { TimelineFeed, type TimelineFeedProps, timelineKey } from './timeline-feed';

type Props = TimelineFeedProps & { action: (text: string) => Promise<CreatePostActionResult> };

/** The composer above the timeline; a new post reloads the first page so it appears on top. */
export function HomeTimeline({ action, ...feed }: Props) {
  const queryClient = useQueryClient();
  return (
    <>
      <ComposeBox
        action={action}
        onPosted={() => void queryClient.resetQueries({ queryKey: timelineKey(feed.kind) })}
      />
      <TimelineFeed {...feed} />
    </>
  );
}
