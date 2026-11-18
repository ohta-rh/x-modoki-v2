'use client';

import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  COMPOSE_PATH,
  KEYBOARD_SHORTCUTS,
  resolveShortcut,
  type ShortcutAction,
} from '@/shared/config';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/kit';

/** Keys typed into a field are the field's. */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const posts = () => [...document.querySelectorAll<HTMLElement>('main article')];
const selectedPost = () => document.activeElement?.closest<HTMLElement>('main article') ?? null;

/** Focuses a post: the focus ring shows it, and it is scrolled into the screen. */
function select(post: HTMLElement | undefined) {
  if (!post) return;
  post.tabIndex = -1;
  post.focus({ preventScroll: true });
  post.scrollIntoView({ block: 'nearest' });
}

/**
 * The keyboard (#29, ui-ux.md 10), for the whole signed-in area: `j` / `k` move the focus through the
 * posts on screen, `l` / `t` press the focused post's like / repost, `r` opens it and focuses its
 * reply box, `g` then `h` / `n` / `p` go home / to notifications / to the profile, `n` opens the
 * composer, `?` lists the keys.
 */
export function KeyboardShortcuts({ username }: { username: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);
  const pending = useRef<string | null>(null);
  const replyNext = useRef(false);

  useEffect(() => {
    const run = (action: ShortcutAction) => {
      const current = selectedPost();
      const list = posts();
      switch (action) {
        case 'compose':
          return router.push(COMPOSE_PATH);
        case 'next':
          return select(current ? list[list.indexOf(current) + 1] : list[0]);
        case 'previous':
          return select(current ? list[list.indexOf(current) - 1] : undefined);
        case 'like':
          return current?.querySelector<HTMLElement>('button[aria-label="いいね"]')?.click();
        case 'repost':
          return current?.querySelector<HTMLElement>('button[aria-label="リポスト"]')?.click();
        case 'reply':
          if (!current) return;
          replyNext.current = true;
          return current.click();
        case 'go-home':
          return router.push('/home' as Route);
        case 'go-notifications':
          return router.push('/notifications' as Route);
        case 'go-profile':
          return router.push(`/${username}` as Route);
        case 'help':
          return setHelpOpen(true);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (typing(event.target)) return;
      const result = resolveShortcut(event, pending.current);
      pending.current = result.pending;
      if (result.action) {
        event.preventDefault();
        run(result.action);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [router, username]);

  // After `r`, the post's page arrives: focus its reply box once it is there.
  useEffect(() => {
    if (!replyNext.current) return;
    let frames = 0;
    let handle = requestAnimationFrame(function find() {
      const box = document.querySelector<HTMLElement>('textarea[aria-label="返信の本文"]');
      if (box || frames > 120) {
        replyNext.current = false;
        box?.focus();
        return;
      }
      frames += 1;
      handle = requestAnimationFrame(find);
    });
    return () => cancelAnimationFrame(handle);
  }, [pathname]);

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-card p-6 sm:max-w-[480px]">
        <DialogTitle className="text-title font-bold">キーボードショートカット</DialogTitle>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <div key={shortcut.keys.join(' ')} className="contents">
              <dt>
                <kbd className="rounded border border-line px-1.5 font-mono">
                  {shortcut.keys.join(' ')}
                </kbd>
              </dt>
              <dd>{shortcut.label}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
