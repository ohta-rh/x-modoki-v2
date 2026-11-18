'use client';

import { Ellipsis, Trash2 } from 'lucide-react';
import { type ReactNode, useState, useTransition } from 'react';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/kit';
import type { DeletePostActionResult } from '../model/types';

type Props = {
  postId: string;
  action: (postId: string) => Promise<DeletePostActionResult>;
  onDeleted: () => void;
  /** More items for the same menu, composed by the caller (e.g. pin, #23). */
  items?: ReactNode;
};

/** The ⋯ menu on the viewer's own post: 削除, then a confirmation (#20). */
export function DeletePostMenu({ postId, action, onDeleted, items }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const result = await action(postId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setConfirming(false);
      onDeleted();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="もっと見る"
          className="inline-flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-brand/10 hover:text-brand"
        >
          <Ellipsis aria-hidden="true" className="size-[18px]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56">
          {items}
          <DropdownMenuItem className="font-bold text-danger" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden="true" />
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          role="alertdialog"
          showCloseButton={false}
          className="max-w-80 rounded-card p-8"
        >
          <DialogTitle className="text-title font-bold">ポストを削除しますか？</DialogTitle>
          <DialogDescription className="text-text-muted">
            この操作は取り消せません。プロフィール、あなたをフォローしているアカウントのタイムライン、検索の結果から削除されます。
          </DialogDescription>
          {error ? (
            <p role="alert" className="text-danger">
              {error}
            </p>
          ) : null}
          <Button className="h-11 w-full bg-danger text-white" disabled={pending} onClick={remove}>
            削除
          </Button>
          <Button variant="outline" className="h-11 w-full" onClick={() => setConfirming(false)}>
            キャンセル
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
