'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { PageHeader } from '@/widgets/app-shell';

const ITEMS = [
  { href: '/settings/account', label: 'アカウント' },
  { href: '/settings/display', label: '表示' },
  { href: '/settings/profile', label: 'プロフィールを編集' },
] as const;

/**
 * The settings (#29): the list on the left and the chosen item on the right. Below 640px one pane
 * at a time: /settings shows the list, an item shows itself.
 */
export function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const atList = pathname === '/settings';
  return (
    <div className="flex">
      <div
        className={`w-full border-line sm:block sm:w-56 sm:shrink-0 sm:border-r ${atList ? '' : 'hidden'}`}
      >
        <PageHeader title="設定" />
        <nav aria-label="設定">
          <ul>
            {ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href as Route}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  className="block px-4 py-3 text-body hover:bg-hover aria-[current=page]:border-r-2 aria-[current=page]:border-brand aria-[current=page]:font-bold"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className={`min-w-0 flex-1 sm:block ${atList ? 'hidden' : ''}`}>{children}</div>
    </div>
  );
}
