import type { ReactNode } from 'react';
import { AppShell } from '@/widgets/app-shell';
import { RightSidebar } from '@/widgets/right-sidebar';

/** The signed-in area: every page in app/(main) sits in the three-column shell, with a modal slot. */
export function MainLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <>
      <AppShell sidebar={<RightSidebar />}>{children}</AppShell>
      {modal}
    </>
  );
}
