'use client';

import { Bookmark } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

type Props = { bookmarked: boolean; onToggle: () => void };

/** The bookmark control of a post (#21): blue and filled when bookmarked. */
export function BookmarkButton({ bookmarked, onToggle }: Props) {
  return (
    <button
      type="button"
      aria-label="ブックマーク"
      aria-pressed={bookmarked}
      onClick={onToggle}
      className={cn(
        'group flex items-center hover:text-brand',
        bookmarked ? 'text-brand' : 'text-text-muted',
      )}
    >
      <span className="rounded-full p-2 group-hover:bg-brand/10">
        <Bookmark aria-hidden="true" className={cn('size-[18px]', bookmarked && 'fill-current')} />
      </span>
    </button>
  );
}
