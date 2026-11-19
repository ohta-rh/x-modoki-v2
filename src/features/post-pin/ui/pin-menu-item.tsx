'use client';

import { Pin } from 'lucide-react';
import { DropdownMenuItem } from '@/shared/ui/dropdown-menu';
import { toast } from '@/shared/ui/toast';
import type { SetPinActionResult } from '../model/types';

type Props = {
  postId: string;
  pinned: boolean;
  action: (postId: string, pinned: boolean) => Promise<SetPinActionResult>;
  onDone: () => void;
};

/** The ⋯ menu item on the viewer's own post: pin it to the profile, or unpin it (#23). */
export function PinMenuItem({ postId, pinned, action, onDone }: Props) {
  return (
    <DropdownMenuItem
      className="font-bold"
      onClick={async () => {
        const result = await action(postId, !pinned);
        if (result.ok) onDone();
        else toast.add({ title: result.message });
      }}
    >
      <Pin aria-hidden="true" />
      {pinned ? '固定を解除' : 'プロフィールに固定する'}
    </DropdownMenuItem>
  );
}
