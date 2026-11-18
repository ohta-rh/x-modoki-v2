import type { ReactNode } from 'react';
import { signOutAction } from '@/features/account-access/index.server';
import { AppShell } from '@/widgets/app-shell';
import type { Viewer } from '../api/load-viewer';
import { RightSidebar } from '@/widgets/right-sidebar';

type Props = { viewer: Viewer | null; children: ReactNode; modal: ReactNode };

/** The signed-in area: every page in app/(main) sits in the three-column shell, with a modal slot. */
export function MainLayout({ viewer, children, modal }: Props) {
  return (
    <>
      <AppShell
        account={viewer ?? undefined}
        unread={viewer?.unread}
        signOut={signOutAction}
        sidebar={<RightSidebar />}
      >
        {children}
      </AppShell>
      {modal}
    </>
  );
}
