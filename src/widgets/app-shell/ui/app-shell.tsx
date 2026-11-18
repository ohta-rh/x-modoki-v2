'use client';

import { Feather } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { COMPOSE_PATH } from '@/shared/config';
import { SiteFooter } from '@/shared/ui/site-footer';
import type { Account } from './account-menu';
import { LeftNav } from './left-nav';
import { TabBar } from './tab-bar';

/**
 * The three-column frame (docs/architecture/ui-ux.md 2): 275 / 600 / 350px from 1280px, an 88px
 * icon rail from 640px, no right sidebar under 1024px, and a bottom tab bar under 640px.
 */
export function AppShell({
  children,
  sidebar,
  account,
  signOut,
  unread,
}: {
  children: ReactNode;
  sidebar?: ReactNode;
  account?: Account;
  signOut?: () => Promise<void>;
  /** The viewer's unread notifications (#26); absent when signed out. */
  unread?: number;
}) {
  const currentPath = usePathname();
  return (
    <div className="flex min-h-screen justify-center">
      <div
        data-testid="left-column"
        className="sticky top-0 hidden h-screen w-[88px] shrink-0 flex-col px-2 sm:flex xl:w-[275px] xl:px-3"
      >
        <LeftNav currentPath={currentPath} account={account} signOut={signOut} unread={unread} />
      </div>
      <main className="min-h-screen w-full max-w-[600px] min-w-0 border-line pb-[53px] sm:border-x sm:pb-0">
        {children}
        <SiteFooter className="lg:hidden" />
      </main>
      {/* Pinned to the top; what does not fit scrolls inside it (#58). */}
      <aside className="sticky top-0 hidden h-screen w-[350px] shrink-0 overflow-y-auto pl-8 lg:block">
        {sidebar}
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-[var(--header-bg)] backdrop-blur-[12px] sm:hidden">
        <TabBar currentPath={currentPath} unread={unread} />
      </div>
      <div className="fixed right-4 bottom-20 z-10 sm:hidden">
        <Link
          href={COMPOSE_PATH}
          aria-label="ポストする"
          className="flex size-14 items-center justify-center rounded-full bg-brand-fill text-on-brand shadow-lg"
        >
          <Feather aria-hidden="true" className="size-6" />
        </Link>
      </div>
    </div>
  );
}
