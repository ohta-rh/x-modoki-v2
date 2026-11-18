import type { ReactNode } from 'react';
import { signOutAction } from '@/features/account-access/index.server';
import { type Account, AppShell } from '@/widgets/app-shell';
import { RightSidebar } from '@/widgets/right-sidebar';

type Props = { viewer: Account; children: ReactNode; modal: ReactNode };

/** The signed-in area: every page in app/(main) sits in the three-column shell, with a modal slot. */
export function MainLayout({ viewer, children, modal }: Props) {
  return (
    <>
      <AppShell account={viewer} signOut={signOutAction} sidebar={<RightSidebar />}>
        {children}
      </AppShell>
      {modal}
    </>
  );
}
