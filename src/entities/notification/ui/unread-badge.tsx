'use client';

import { useQuery } from '@tanstack/react-query';

const POLL_MS = 30_000;

/**
 * The unread count on 通知 (#26): starts from the server's count and asks again every 30 seconds
 * while the tab is visible (ADR-0011: polling, no socket). Hidden at zero.
 */
export function UnreadBadge({ initial }: { initial: number }) {
  const { data: count } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/unread-count');
      // Signed out in another tab, or the session ended: nothing to show (401, #33).
      if (!response.ok) return 0;
      return ((await response.json()) as { count: number }).count;
    },
    initialData: initial,
    staleTime: POLL_MS,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });
  if (count === 0) return null;
  // Read as 「通知 未読 N 件」: the words are for screen readers, the number is what is seen.
  return (
    <>
      {' '}
      <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-fill px-1.5 text-[11px] leading-5 font-bold text-on-brand">
        {/* Spaces outside the hidden words: a name keeps text spaces, not an element's edges.
            A flex box shows no whitespace-only text. */}
        <span className="sr-only">未読</span> {count} <span className="sr-only">件</span>
      </span>
    </>
  );
}
