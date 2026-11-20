import type { ReactNode } from 'react';
import { SiteFooter } from '@/shared/ui/site-footer';

/**
 * The right column (ui-ux.md 2): what the page puts in it — the search box, trends and who to
 * follow (#27) — and the footer under them.
 */
export function RightSidebar({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 py-3">
      {children}
      <SiteFooter />
    </div>
  );
}
