'use client';

import { PenLine, Repeat2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { compactCount } from '@/shared/lib/format';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

type Props = { reposted: boolean; count: number; onToggle: () => void; onQuote: () => void };

/** The repost control of a post (#22): green when reposted; opens リポスト / 引用. */
export function RepostMenu({ reposted, count, onToggle, onQuote }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        // The number shown is part of the name (WCAG 2.5.3, #31).
        aria-label={count > 0 ? `リポスト ${compactCount(count)}` : 'リポスト'}
        data-action="repost"
        className={cn(
          'group flex items-center gap-1 text-[13px] hover:text-repost',
          reposted ? 'text-repost' : 'text-text-muted',
        )}
      >
        <span className="rounded-full p-2 group-hover:bg-repost/10">
          <Repeat2 aria-hidden="true" className="size-[18px]" />
        </span>
        <span>{count > 0 ? compactCount(count) : ''}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem className="font-bold" onClick={onToggle}>
          <Repeat2 aria-hidden="true" />
          {reposted ? 'リポストを取り消す' : 'リポスト'}
        </DropdownMenuItem>
        <DropdownMenuItem className="font-bold" onClick={onQuote}>
          <PenLine aria-hidden="true" />
          引用
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
