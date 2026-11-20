'use client';

import { Ellipsis } from 'lucide-react';
import { Avatar } from '@/shared/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { toast } from '@/shared/ui/toast';
import { OFFLINE_MESSAGE } from '@/shared/lib/settle';
import { unstable_rethrow } from 'next/navigation';

export type Account = { name: string; username: string; image: string | null };

/** The account switcher at the bottom of the left navigation (ui-ux.md 3). */
export function AccountMenu({
  account,
  signOut,
}: {
  account: Account;
  signOut: () => Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-account-menu
        aria-label={`${account.name} @${account.username} のアカウントのメニュー`}
        className="mt-auto mb-3 flex w-full items-center gap-3 rounded-full p-3 text-left hover:bg-hover"
      >
        <Avatar name={account.name} src={account.image} />
        <span className="hidden min-w-0 flex-1 xl:block">
          <span className="block truncate font-bold">{account.name}</span>
          <span className="block truncate text-text-muted">@{account.username}</span>
        </span>
        <Ellipsis aria-hidden="true" className="hidden size-5 xl:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          // Offline the sign-out never reaches the server: say so (#82).
          onClick={() =>
            void signOut().catch((error: unknown) => {
              // Signed out: Next.js rejects with the redirect to move the page. Not a failure.
              unstable_rethrow(error);
              toast.add({ title: OFFLINE_MESSAGE });
            })
          }
        >
          @{account.username}からログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
