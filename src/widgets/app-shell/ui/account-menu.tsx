'use client';

import { Ellipsis } from 'lucide-react';
import { Avatar } from '@/shared/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

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
        <DropdownMenuItem onClick={() => void signOut()}>
          @{account.username}からログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
