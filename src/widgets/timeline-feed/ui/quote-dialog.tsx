'use client';

import { type Post, QuotedCard } from '@/entities/post';
import { ComposeBox, type CreatePostActionResult } from '@/features/post-compose';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog';

type Props = {
  /** The post being quoted; null renders nothing. */
  post: Post | null;
  now: Date;
  action: (text: string, quoteOfId: string) => Promise<CreatePostActionResult>;
  onClose: () => void;
  onPosted: () => void;
};

/** The quote composer (#22): the comment box with the quoted post nested under it. */
export function QuoteDialog({ post, now, action, onClose, onPosted }: Props) {
  if (!post) return null;
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-card p-0 pb-4 sm:max-w-[600px]">
        <DialogTitle className="sr-only">引用</DialogTitle>
        <ComposeBox
          label="引用の本文"
          placeholder="コメントを追加"
          action={(text) => action(text, post.id)}
          onPosted={onPosted}
        />
        <div className="px-4">
          <QuotedCard
            now={now}
            quoted={{
              id: post.id,
              author: post.author,
              text: post.text,
              links: post.links,
              createdAt: post.createdAt,
              quotesAnother: post.quoted !== null,
              media: post.media,
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
