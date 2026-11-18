import { Bell, House, Search } from 'lucide-react';
import Link from 'next/link';
import { tabItems } from '@/shared/config';
import { cn } from '@/shared/lib/cn';
import { isCurrent } from './left-nav';

const ICONS = { home: House, explore: Search, notifications: Bell } as const;

/** The bottom tab bar under 640px (docs/architecture/ui-ux.md 2–3). */
export function TabBar({ currentPath }: { currentPath: string }) {
  return (
    <nav aria-label="下のタブ" className="flex h-[53px] items-center justify-around">
      {tabItems.map((item) => {
        const active = isCurrent(currentPath, item.href);
        const Icon = ICONS[item.key as keyof typeof ICONS];
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={cn('rounded-full p-3 text-text hover:bg-hover')}
          >
            <Icon
              aria-hidden="true"
              data-active={active}
              className="size-6"
              fill={active && item.key !== 'explore' ? 'currentColor' : 'none'}
              strokeWidth={active ? 2.5 : 2}
            />
          </Link>
        );
      })}
    </nav>
  );
}
