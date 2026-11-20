'use client';

import { LoaderCircle } from 'lucide-react';
import { type ReactNode, type TouchEvent, useRef, useState } from 'react';

/** How far a pull must go before letting go reads the list again. */
const THRESHOLD = 80;

/**
 * Pull to refresh below 640px (#28, ui-ux.md 6): a touch that starts at the very top and is dragged
 * down at least 80px reads the list again when released. Wider screens, or a touch that starts
 * scrolled down, are left to the browser.
 */
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => void;
  children: ReactNode;
}) {
  const start = useRef<number | null>(null);
  const [distance, setDistance] = useState(0);
  // A touch start or move always has the finger that caused it.
  const y = (event: TouchEvent) => event.touches[0].clientY;
  return (
    <div
      onTouchStart={(event) => {
        const narrow = window.matchMedia('(max-width: 639px)').matches;
        start.current = narrow && window.scrollY === 0 ? y(event) : null;
      }}
      onTouchMove={(event) => {
        if (start.current !== null) setDistance(Math.max(0, y(event) - start.current));
      }}
      onTouchEnd={() => {
        if (distance >= THRESHOLD) onRefresh();
        start.current = null;
        setDistance(0);
      }}
      // The system took the touch (a call, an OS gesture): the pull is abandoned (review 1).
      onTouchCancel={() => {
        start.current = null;
        setDistance(0);
      }}
    >
      {distance > 0 ? (
        <div
          data-testid="pull-indicator"
          aria-hidden="true"
          className="flex items-end justify-center overflow-hidden"
          style={{ height: `${Math.min(distance, THRESHOLD)}px` }}
        >
          <LoaderCircle
            className={`mb-2 size-6 text-brand ${distance >= THRESHOLD ? 'animate-spin' : ''}`}
          />
        </div>
      ) : null}
      {children}
    </div>
  );
}
