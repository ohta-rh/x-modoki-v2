'use client';

import { Heart } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { compactCount } from '@/shared/lib/format';

type Props = { liked: boolean; count: number; onToggle: () => void };

/** The like control of a post (#21): pink and filled when liked, with a pop unless motion is reduced. */
export function LikeButton({ liked, count, onToggle }: Props) {
  return (
    <button
      type="button"
      // The number shown is part of the name (WCAG 2.5.3, #31).
      aria-label={count > 0 ? `いいね ${compactCount(count)}` : 'いいね'}
      aria-pressed={liked}
      data-action="like"
      onClick={onToggle}
      className={cn(
        'group flex items-center gap-1 text-[13px] hover:text-like',
        liked ? 'text-like' : 'text-text-muted',
      )}
    >
      <span className="rounded-full p-2 group-hover:bg-like/10">
        <Heart
          aria-hidden="true"
          className={cn('size-[18px]', liked && 'fill-current motion-safe:animate-like-pop')}
        />
      </span>
      <span>{count > 0 ? compactCount(count) : ''}</span>
    </button>
  );
}
