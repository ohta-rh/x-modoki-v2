import type { Route } from 'next';
import Link from 'next/link';
import type { TimelineKind } from '@/entities/post';

const TABS: { kind: TimelineKind; label: string; href: Route }[] = [
  { kind: 'for-you', label: 'おすすめ', href: '/home' as Route },
  { kind: 'following', label: 'フォロー中', href: '/home?tab=following' as Route },
];

/** おすすめ / フォロー中; the selected tab has a 4px accent underline (ui-ux.md 6). */
export function HomeTabs({ kind }: { kind: TimelineKind }) {
  return (
    <div role="tablist" className="flex border-b border-line">
      {TABS.map((tab) => {
        const selected = tab.kind === kind;
        return (
          <Link
            key={tab.kind}
            href={tab.href}
            role="tab"
            aria-selected={selected}
            className={`flex h-[53px] flex-1 items-center justify-center hover:bg-hover ${selected ? 'font-bold' : 'text-text-muted'}`}
          >
            <span className="relative flex h-full items-center">
              {tab.label}
              {selected ? (
                <span
                  data-indicator
                  className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-brand"
                />
              ) : null}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
