'use client';

import { useRef, useState, useTransition } from 'react';
import { MAX_WEIGHTED_LENGTH, measurePost } from '@/shared/lib/text';
import { Button } from '@/shared/ui/button';
import type { CreatePostActionResult } from '../model/types';

type Props = {
  action: (text: string) => Promise<CreatePostActionResult>;
  onPosted?: () => void;
};

const RADIUS = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const RING_COLOR = { normal: 'var(--accent)', warning: '#ffd400', over: 'var(--danger)' } as const;

/** The inline composer at the top of /home (docs/architecture/ui-ux.md 7). */
export function ComposeBox({ action, onPosted }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  const { weighted, remaining, postable } = measurePost(text);
  const state = remaining < 0 ? 'over' : remaining <= 20 ? 'warning' : 'normal';

  const submit = () =>
    startTransition(async () => {
      const result = await action(text);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setText('');
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
        aria-label="投稿の本文"
        placeholder="いまの話題は？"
        rows={1}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          event.target.style.height = `${event.target.scrollHeight}px`;
        }}
        className="min-h-12 w-full resize-none bg-transparent py-2 text-title outline-none placeholder:text-text-muted"
      />
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
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
          ポストする
        </Button>
      </div>
    </form>
  );
}
