'use client';

import { type ReactNode, useEffect, useRef, useState, useTransition } from 'react';
import { MAX_WEIGHTED_LENGTH, measurePost } from '@/shared/lib/text';
import { Button } from '@/shared/ui/button';
import type { CreatePostActionResult } from '../model/types';

/** Uploaded images to send with the text (#25), composed by the caller (media-upload). */
export type ComposeAttachments = {
  node: ReactNode;
  media: { id: string; alt: string }[];
  count: number;
  /** Every chosen image has finished uploading. */
  ready: boolean;
  clear: () => void;
};

type Props = {
  action: (text: string, media: ComposeAttachments['media']) => Promise<CreatePostActionResult>;
  attachments?: ComposeAttachments;
  onPosted?: () => void;
  label?: string;
  submitLabel?: string;
  placeholder?: string;
};

const RADIUS = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const RING_COLOR = { normal: 'var(--accent)', warning: '#ffd400', over: 'var(--danger)' } as const;

/** The inline composer at the top of /home (docs/architecture/ui-ux.md 7). */
export function ComposeBox({
  action,
  attachments,
  onPosted,
  label = '投稿の本文',
  submitLabel = 'ポストする',
  placeholder = 'いまの話題は？',
}: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  // Text typed before hydration is in the DOM but not in state (#47): take it in once mounted.
  useEffect(() => {
    const typed = ref.current!.value;
    if (typed === '') return;
    setText(typed);
    ref.current!.style.height = `${ref.current!.scrollHeight}px`;
  }, []);
  const { weighted, remaining, postable: textPostable } = measurePost(text);
  // Images alone may be posted (#25); nothing is sent while one is still uploading.
  const count = attachments?.count ?? 0;
  const postable = (textPostable || (text === '' && count > 0)) && (attachments?.ready ?? true);
  const state = remaining < 0 ? 'over' : remaining <= 20 ? 'warning' : 'normal';

  const submit = () =>
    startTransition(async () => {
      const result = await action(text, attachments?.media ?? []);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setText('');
      attachments?.clear();
      setError(null);
      ref.current!.style.height = ''; // the textarea is mounted while its form submits
      onPosted?.();
    });

  return (
    <form
      className="flex flex-col gap-2 border-b border-line px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={ref}
        aria-label={label}
        placeholder={placeholder}
        rows={1}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          // Reset first: scrollHeight never drops below the current height, so the box could not shrink.
          event.target.style.height = 'auto';
          event.target.style.height = `${event.target.scrollHeight}px`;
        }}
        className="min-h-12 w-full resize-none bg-transparent py-2 text-title outline-none placeholder:text-text-muted"
      />
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      {attachments ? <div>{attachments.node}</div> : null}
      <div className="flex items-center justify-end gap-3 border-t border-line pt-3">
        {text ? (
          <svg
            data-testid="ring"
            data-state={state}
            viewBox="0 0 24 24"
            className="size-6 -rotate-90"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="2" />
            <circle
              cx="12"
              cy="12"
              r={RADIUS}
              fill="none"
              stroke={RING_COLOR[state]}
              strokeWidth="2"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={
                CIRCUMFERENCE * (1 - Math.min(weighted, MAX_WEIGHTED_LENGTH) / MAX_WEIGHTED_LENGTH)
              }
            />
          </svg>
        ) : null}
        {text && remaining <= 20 ? (
          <span
            data-testid="remaining"
            className={remaining < 0 ? 'text-danger' : 'text-text-muted'}
          >
            {remaining}
          </span>
        ) : null}
        <Button type="submit" variant="brand" disabled={!postable || pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
