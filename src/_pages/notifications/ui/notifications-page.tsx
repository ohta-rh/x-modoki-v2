import type { Route } from 'next';
import Link from 'next/link';
import type { NotificationPage } from '@/entities/notification';
import { markNotificationsReadAction } from '@/features/notifications-read/index.server';
import { PageHeader } from '@/widgets/app-shell';
import { NotificationList } from '@/widgets/notification-list';

type Tab = 'all' | 'mentions';
type Props = { tab: Tab; firstPage: NotificationPage };

const TABS: { tab: Tab; label: string; href: string }[] = [
  { tab: 'all', label: 'すべて', href: '/notifications' },
  { tab: 'mentions', label: 'メンション', href: '/notifications/mentions' },
];

/** /notifications and /notifications/mentions (#26, ui-ux.md 通知). */
export function NotificationsPage({ tab, firstPage }: Props) {
  return (
    <>
      <PageHeader title="通知" />
      <div role="tablist" className="flex border-b border-line">
        {TABS.map((item) => {
          const selected = item.tab === tab;
          return (
            <Link
              key={item.tab}
              href={item.href as Route}
              role="tab"
              aria-selected={selected}
              className={`flex h-[53px] flex-1 items-center justify-center hover:bg-hover ${selected ? 'font-bold' : 'text-text-muted'}`}
            >
              <span className="relative flex h-full items-center">
                {item.label}
                {selected ? (
                  <span className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-brand" />
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
      <NotificationList
        key={tab}
        tab={tab}
        firstPage={firstPage}
        markRead={markNotificationsReadAction}
      />
    </>
  );
}
