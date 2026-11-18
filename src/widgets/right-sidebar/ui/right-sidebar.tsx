import { SiteFooter } from '@/shared/ui/site-footer';

/** The right column. Search and trends arrive with their PBIs; for now it holds the footer. */
export function RightSidebar() {
  return (
    <div className="flex flex-col gap-4 py-3">
      <SiteFooter />
    </div>
  );
}
