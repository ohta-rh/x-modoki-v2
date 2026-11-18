'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';

type Props =
  | { following: boolean; onToggle: () => void; loginHref?: undefined }
  /** Signed out: a link to the login screen that comes back here (#24). */
  | { following: false; loginHref: string; onToggle?: undefined };

const BASE = 'inline-flex h-9 items-center rounded-full px-4 text-body font-bold';

/**
 * Follow / フォロー中 (#24, ui-ux.md 8). While following, hover offers フォロー解除 in the danger
 * colour, as on X — but not right after pressing, until the pointer has left once.
 */
export function FollowButton(props: Props) {
  const [armed, setArmed] = useState(false);
  // Set by pressing: the pointer must leave once before フォロー解除 is offered again.
  const [settled, setSettled] = useState(true);
  if (props.loginHref !== undefined) {
    return (
      <Link href={props.loginHref as Route} className={cn(BASE, 'bg-text text-bg')}>
        フォロー
      </Link>
    );
  }
  const { following, onToggle } = props;
  return (
    <button
      type="button"
      onClick={() => {
        setArmed(false);
        setSettled(false);
        onToggle();
      }}
      onMouseEnter={() => setArmed(settled)}
      onMouseLeave={() => {
        setArmed(false);
        setSettled(true);
      }}
      className={cn(
        BASE,
        following
          ? cn('border border-line', armed && 'border-danger/40 bg-danger/10 text-danger')
          : 'bg-text text-bg hover:opacity-90',
      )}
    >
      {following ? (armed ? 'フォロー解除' : 'フォロー中') : 'フォロー'}
    </button>
  );
}
