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

/** Posts, not the quoted cards inside them (also articles, review 1). */
const isPost = (article: HTMLElement) => !article.parentElement?.closest('article');
const posts = () => [...document.querySelectorAll<HTMLElement>('main article')].filter(isPost);
/** The post holding the focus: the outermost article around it. */
function selectedPost() {
  let article = document.activeElement?.closest<HTMLElement>('main article') ?? null;
  while (article && !isPost(article))
    article = article.parentElement!.closest<HTMLElement>('article');
  return article;
}
/** A dialog on screen keeps the keys (ui-ux.md 10). One Next.js keeps hidden (Activity) does not. */
const dialogOpen = () =>
  [...document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]')].some(
    (dialog) => dialog.checkVisibility?.() ?? true,
  );
const replyBox = () => document.querySelector<HTMLElement>('textarea[aria-label="返信の本文"]');
/** The opened post's own article, not one Next.js keeps hidden (Activity). */
const mainPost = () =>
  [...document.querySelectorAll<HTMLElement>('main article[data-post="main"]')].find(
    (article) => article.checkVisibility?.() ?? true,
  );

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
  // Where the focus goes when the opened post's page arrives (`r`: its reply box, `o`: the post).
  const focusNext = useRef<'reply' | 'post' | null>(null);

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
          // By role, not name: the name carries the count shown (#31).
          return current?.querySelector<HTMLElement>('[data-action="like"]')?.click();
        case 'repost':
          return current?.querySelector<HTMLElement>('[data-action="repost"]')?.click();
        case 'open':
          // A post card opens on click; a keyboard user opens the one selected (#31, WCAG 2.1.1).
          if (current?.dataset.post !== 'card') return;
          focusNext.current = 'post';
          return current.click();
        case 'reply':
          if (!current) return;
          // The page's own post: its reply box is right here (review 1).
          if (current.dataset.post === 'main') return replyBox()?.focus();
          // Only a post card opens its post; another article (a notification) goes nowhere (review 3).
          if (current.dataset.post !== 'card') return;
          focusNext.current = 'reply';
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
      if (typing(event.target) || dialogOpen()) return;
      // Enter is a shortcut only on the selected post itself: on a link or button it is theirs.
      if (event.key === 'Enter') {
        if (!(event.target instanceof HTMLElement && event.target.matches('[data-post="card"]')))
          return;
        event.preventDefault();
        return run('open');
      }
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

  // After `r` / `o`, the post's page arrives: focus its reply box / the post once it is there.
  // Moving the focus there also moves where Tab goes next: left on the card the page came from,
  // Firefox kept tabbing from that hidden card and never reached the page (#31).
  useEffect(() => {
    if (!focusNext.current) return;
    let frames = 0;
    let handle = requestAnimationFrame(function find() {
      const target = focusNext.current === 'reply' ? replyBox() : mainPost();
      if (target || frames > 120) {
        focusNext.current = null;
        if (target) {
          target.tabIndex = target.tabIndex < 0 ? -1 : target.tabIndex;
          target.focus({ preventScroll: true });
        }
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
