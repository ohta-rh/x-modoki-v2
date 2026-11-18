'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ImageAttachments, useImageAttachments } from '@/features/media-upload';
import { ComposeBox, type CreatePostActionResult } from '@/features/post-compose';
import { PullToRefresh } from '@/features/timeline-new-posts';
import { TimelineFeed, type TimelineFeedProps, timelineKey } from './timeline-feed';

type Props = TimelineFeedProps & {
  action: (text: string, media: { id: string; alt: string }[]) => Promise<CreatePostActionResult>;
};

/**
 * The composer above the timeline, with up to four images (#25); a new post reloads the first
 * page so it appears on top. Below 640px, pulling the list down reads it again (#28).
 */
export function HomeTimeline({ action, ...feed }: Props) {
  const queryClient = useQueryClient();
  const attachments = useImageAttachments();
  const reload = () => void queryClient.resetQueries({ queryKey: timelineKey(feed.kind) });
  return (
    <PullToRefresh onRefresh={reload}>
      <ComposeBox
        action={action}
        attachments={{ ...attachments, node: <ImageAttachments attachments={attachments} /> }}
        onPosted={reload}
      />
      <TimelineFeed {...feed} />
    </PullToRefresh>
  );
}
