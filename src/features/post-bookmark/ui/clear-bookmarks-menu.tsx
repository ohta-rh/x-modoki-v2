'use client';

import { Ellipsis, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
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
import type { ClearBookmarksActionResult } from '../model/types';

type Props = { action: () => Promise<ClearBookmarksActionResult>; onCleared: () => void };

/** The ⋯ menu of the bookmarks page: ブックマークを全て削除, then a confirmation (#21). */
export function ClearBookmarksMenu({ action, onCleared }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const clear = () =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setConfirming(false);
      onCleared();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="ブックマークのメニュー"
          className="ml-auto inline-flex size-9 items-center justify-center rounded-full hover:bg-hover"
        >
          <Ellipsis aria-hidden="true" className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem className="font-bold text-danger" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden="true" />
            ブックマークを全て削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          role="alertdialog"
          showCloseButton={false}
          className="max-w-80 rounded-card p-8"
        >
          <DialogTitle className="text-title font-bold">
            ブックマークを全て削除しますか？
          </DialogTitle>
          <DialogDescription className="text-text-muted">
            この操作は取り消せません。ブックマークから全てのポストが削除されます。
          </DialogDescription>
          {error ? (
            <p role="alert" className="text-danger">
              {error}
            </p>
          ) : null}
          <Button className="h-11 w-full bg-danger text-white" disabled={pending} onClick={clear}>
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
