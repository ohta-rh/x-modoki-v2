import type { ReactNode } from 'react';
import { signOutAction } from '@/features/account-access/index.server';
import { DisplaySync } from '@/features/display-settings';
import { SearchBox } from '@/features/search-box';
import { setFollowAction } from '@/features/user-follow/index.server';
import { LOGIN_PATH } from '@/shared/config';
import { AppShell } from '@/widgets/app-shell';
import { KeyboardShortcuts } from '@/widgets/keyboard-shortcuts';
import { RightSidebar } from '@/widgets/right-sidebar';
import { Trends } from '@/widgets/trends';
import { WhoToFollow } from '@/widgets/who-to-follow';
import type { SidebarData } from '../api/load-sidebar';
import type { Viewer } from '../api/load-viewer';

type Props = { viewer: Viewer | null; sidebar: SidebarData; children: ReactNode; modal: ReactNode };

/** The signed-in area: every page in app/(main) sits in the three-column shell, with a modal slot. */
export function MainLayout({ viewer, sidebar, children, modal }: Props) {
  return (
    <>
      <AppShell
        account={viewer ?? undefined}
        unread={viewer?.unread}
        signOut={signOutAction}
        sidebar={
          <RightSidebar>
            <SearchBox />
            <Trends trends={sidebar.trends} />
            {viewer ? (
              <WhoToFollow users={sidebar.suggestions} action={setFollowAction} />
            ) : (
              <WhoToFollow users={sidebar.suggestions} loginHref={LOGIN_PATH} />
            )}
          </RightSidebar>
        }
      >
        {children}
      </AppShell>
      {modal}
      {viewer ? (
        <>
          <KeyboardShortcuts username={viewer.username} />
          <DisplaySync theme={viewer.theme} accent={viewer.accent} />
        </>
      ) : null}
    </>
  );
}
