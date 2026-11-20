'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { type ComponentType, useRef, useState } from 'react';
import type { Props } from './user-hover-card-live';

type Live = ComponentType<Props & { defaultOpen?: boolean; focusOnMount?: boolean }>;

// The card (Base UI) arrives with the first hover, not with every page (#32, ADR-0059).
let live: Live | null = null;
let loading: Promise<Live> | null = null;

function load(): Promise<Live> {
  loading ??= import('./user-hover-card-live').then((module) => (live = module.UserHoverCardLive));
  return loading;
}

/** How long a pointer rests on a name before its card opens (#23, as on X). */
const DELAY_MS = 500;

/**
 * A link to a profile that, after about half a second of hover, shows a small card of the user.
 * Until someone hovers a name it is a plain link; the card's parts load on the first hover.
 */
export function UserHoverCard(props: Props) {
  const [Card, setCard] = useState<Live | null>(() => live);
  // Swapped in by a rested pointer: the card opens at once. Already loaded: it opens on hover.
  const [rested, setRested] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Still on the name when the parts arrive: on a slow network they can come after it has left.
  const hovering = useRef(false);
  // Reached by keyboard: the real link takes the focus back when it replaces this one.
  const [focused, setFocused] = useState(false);
  if (Card) return <Card {...props} defaultOpen={rested} focusOnMount={focused} />;
  const { username, label, className, children } = props;
  // Hover and keyboard focus both open the card, as Base UI's trigger does (#32 review 3).
  const enter = (byFocus: boolean) => {
    hovering.current = true;
    void load();
    timer.current = setTimeout(() => {
      void load().then((loaded) => {
        if (!hovering.current) return;
        setFocused(byFocus);
        setRested(true);
        setCard(() => loaded);
      });
    }, DELAY_MS);
  };
  const leave = () => {
    hovering.current = false;
    clearTimeout(timer.current);
  };
  return (
    <Link
      href={`/${username}` as Route}
      aria-label={label}
      className={className}
      onPointerEnter={() => enter(false)}
      onPointerLeave={leave}
      onFocus={() => enter(true)}
      onBlur={leave}
    >
      {children}
    </Link>
  );
}
