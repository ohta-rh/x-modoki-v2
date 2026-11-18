import { Bell, Bookmark, Ellipsis, Feather, House, Search, User } from 'lucide-react';
import Link from 'next/link';
import { COMPOSE_PATH, type NavKey, navItems, SETTINGS_PATH } from '@/shared/config';
import { cn } from '@/shared/lib/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/kit';
import { Logo } from '@/shared/ui/logo';

const ICONS: Record<NavKey, typeof House> = {
  home: House,
  explore: Search,
  notifications: Bell,
  bookmarks: Bookmark,
  profile: User,
};

/** True when `currentPath` is `href` or below it. */
export const isCurrent = (currentPath: string, href: string) =>
  currentPath === href || currentPath.startsWith(`${href}/`);

const itemClass =
  'flex items-center gap-5 rounded-full p-3 text-xl text-text transition-colors hover:bg-hover';

/** The left navigation (docs/architecture/ui-ux.md 3). Labels show from 1280px; icons only below. */
export function LeftNav({ currentPath, username }: { currentPath: string; username?: string }) {
  return (
    <nav aria-label="メインのメニュー" className="flex flex-col items-center gap-1 xl:items-start">
      <Link href="/home" aria-label="x-modoki のホーム" className={cn(itemClass, 'text-brand')}>
        <Logo />
      </Link>
      {navItems(username).map((item) => {
        const active = isCurrent(currentPath, item.href);
        const Icon = ICONS[item.key];
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={cn(itemClass, active && 'font-bold')}
          >
            <Icon
              aria-hidden="true"
              data-active={active}
              className="size-6"
              fill={active && item.key !== 'explore' ? 'currentColor' : 'none'}
              strokeWidth={active ? 2.5 : 2}
            />
            <span className="hidden pr-4 xl:inline">{item.label}</span>
          </Link>
        );
      })}
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="もっと見る" className={itemClass}>
          <Ellipsis aria-hidden="true" className="size-6" />
          <span className="hidden pr-4 xl:inline">もっと見る</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem render={<Link href={SETTINGS_PATH} />}>
            設定とプライバシー
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Link
        href={COMPOSE_PATH}
        aria-label="投稿する"
        className="mt-4 flex size-14 items-center justify-center rounded-full bg-brand text-body-lg font-bold text-white transition-opacity hover:opacity-90 xl:h-[52px] xl:w-[233px]"
      >
        <Feather aria-hidden="true" className="size-6 xl:hidden" />
        <span className="hidden xl:inline">ポストする</span>
      </Link>
    </nav>
  );
}
