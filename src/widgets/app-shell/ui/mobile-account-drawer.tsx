'use client';

import { Bookmark, Settings, User } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OFFLINE_MESSAGE } from '@/shared/lib/settle';
import { Avatar } from '@/shared/ui/avatar';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toast';
import type { Account } from './account-menu';

/**
 * Below 640px, where the left column is hidden: the avatar at the top left of the header opens a
 * drawer with the person's own pages and sign-out (ui-ux.md 2, #85).
 */
export function MobileAccountDrawer({
  account,
  signOut,
}: {
  account: Account;
  signOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  // From 640px the left column has its own menu: a drawer left open by widening (a rotated tablet)
  // closes instead of lingering over it with its button hidden (#87).
  useEffect(() => {
    if (!open) return;
    const wide = window.matchMedia('(min-width: 640px)');
    const onChange = (event: { matches: boolean }) => {
      if (event.matches) setOpen(false);
    };
    wide.addEventListener('change', onChange);
    return () => wide.removeEventListener('change', onChange);
  }, [open]);
  const links = [
    { name: 'プロフィール', href: `/${account.username}`, icon: User },
    { name: 'ブックマーク', href: '/i/bookmarks', icon: Bookmark },
    { name: '設定', href: '/settings', icon: Settings },
  ];
  return (
    <div data-mobile-account className="fixed top-[10px] left-4 z-20 sm:hidden">
      <button
        type="button"
        aria-label={`${account.name} @${account.username} のアカウントのメニュー`}
        onClick={() => setOpen(true)}
        className="rounded-full"
      >
        <Avatar name={account.name} src={account.image} size={32} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          // Closed by widening, the avatar is hidden: focus goes to the left column's account menu,
          // which took its place, instead of falling to the page (#87, round 7).
          finalFocus={() =>
            window.matchMedia('(min-width: 640px)').matches
              ? document.querySelector<HTMLElement>('[data-account-menu]')
              : true
          }
          className="top-0 left-0 h-dvh max-h-dvh w-[280px] max-w-[85vw] translate-x-0 translate-y-0 content-start rounded-none p-4 sm:max-w-[280px]"
        >
          <DialogTitle className="sr-only">アカウント</DialogTitle>
          <Avatar name={account.name} src={account.image} size={40} />
          <div className="min-w-0">
            <p className="truncate font-bold">{account.name}</p>
            <p className="truncate text-text-muted">@{account.username}</p>
          </div>
          <nav aria-label="アカウントのページ" className="flex flex-col">
            {links.map(({ name, href, icon: Icon }) => (
              <Link
                key={href}
                href={href as Route}
                onClick={close}
                className="flex items-center gap-4 py-3 text-title font-bold"
              >
                <Icon aria-hidden="true" className="size-6" />
                {name}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            className="py-3 text-left text-body font-bold"
            onClick={() =>
              void signOut().catch((error: unknown) => {
                // Signed out: Next.js rejects with the redirect to move the page (ADR-0065).
                unstable_rethrow(error);
                toast.add({ title: OFFLINE_MESSAGE });
              })
            }
          >
            ログアウト
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
