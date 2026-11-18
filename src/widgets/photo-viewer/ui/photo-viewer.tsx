'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Post } from '@/entities/post';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/kit';

type Props = {
  media: Post['media'];
  /** The post's URL; the viewer is at `{base}/photo/{n}`. */
  base: string;
  /** The image shown first, from 1. */
  index: number;
  onClose: () => void;
};

const step =
  'absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none';

/**
 * A post's images over the current screen (#25, routing.md): left/right keys and buttons move
 * between them, Esc or 閉じる closes. Moving replaces the URL in place (`/photo/{n}`), so a reload
 * opens the same image and going back leaves the viewer in one step.
 */
export function PhotoViewer({ media, base, index, onClose }: Props) {
  const [n, setN] = useState(index);
  const go = (to: number) => {
    if (to < 1 || to > media.length) return;
    setN(to);
    window.history.replaceState(null, '', `${base}/photo/${to}`);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') go(n - 1);
      if (event.key === 'ArrowRight') go(n + 1);
    };
    // Captured: the dialog's own key handling stops arrows on the focused buttons from bubbling.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
  const image = media[n - 1];
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="flex h-dvh max-h-none w-screen max-w-none items-center justify-center rounded-none border-0 bg-black/90 p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">画像</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element -- served by the media host (ADR-0008) */}
        <img
          src={image.url}
          alt={image.alt}
          width={image.width}
          height={image.height}
          className="max-h-full max-w-full object-contain"
        />
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className={`${step} top-6 left-4 translate-y-0`}
        >
          <X aria-hidden="true" className="size-5" />
        </button>
        {n > 1 ? (
          <button
            type="button"
            aria-label="前の画像"
            onClick={() => go(n - 1)}
            className={`${step} left-4`}
          >
            <ChevronLeft aria-hidden="true" className="size-6" />
          </button>
        ) : null}
        {n < media.length ? (
          <button
            type="button"
            aria-label="次の画像"
            onClick={() => go(n + 1)}
            className={`${step} right-4`}
          >
            <ChevronRight aria-hidden="true" className="size-6" />
          </button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
