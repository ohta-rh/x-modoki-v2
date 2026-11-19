'use client';

import { type ReactNode, useEffect, useRef, useState, useTransition } from 'react';
import { OFFLINE_MESSAGE, settle } from '@/shared/lib/settle';
import { MAX_WEIGHTED_LENGTH } from '@/shared/lib/text';
import type { PostMeasure } from '@/shared/lib/text-parse';
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
  /** Gets the new post's id (#28). */
  onPosted?: (id: string) => void;
  /** The text to open with (a saved draft, #28). */
  initialText?: string;
  /** Told of every change of the text, so a container knows whether there is anything to lose. */
  onTextChange?: (text: string) => void;
  autoFocus?: boolean;
  label?: string;
  submitLabel?: string;
  placeholder?: string;
};

const RADIUS = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const RING_COLOR = { normal: 'var(--accent)', warning: '#ffd400', over: 'var(--danger)' } as const;

/** The inline composer at the top of /home (docs/architecture/ui-ux.md 7). */
/**
 * Before the parser arrives: no count is shown, and any non-blank text may be sent. The server
 * weighs it with the same parser and refuses an over-long post with its message (#32, CI run
 * 44462798903: a quick press found the button disabled).
 */
const unmeasured = (text: string): PostMeasure => ({
  weighted: 0,
  remaining: MAX_WEIGHTED_LENGTH,
  postable: text.trim().length > 0,
});

/** Loads the parser once per box and hands its measure to `setMeasure`. */
function startLoading(
  loading: { current: boolean },
  setMeasure: (measure: () => (text: string) => PostMeasure) => void,
) {
  if (loading.current) return;
  loading.current = true;
  void import('@/shared/lib/text-parse').then((parse) => setMeasure(() => parse.measurePost));
}

export function ComposeBox({
  action,
  attachments,
  onPosted,
  initialText = '',
  onTextChange,
  autoFocus,
  label = '投稿の本文',
  submitLabel = 'ポストする',
  placeholder = 'いまの話題は？',
}: Props) {
  const [text, setTextState] = useState(initialText);
  const setText = (next: string) => {
    setTextState(next);
    onTextChange?.(next);
  };
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  // The parser that weighs a post is loaded when someone starts to write, not with the page (#32).
  const [measure, setMeasure] = useState<((text: string) => PostMeasure) | null>(null);
  const loading = useRef(false);
  const loadMeasure = () => startLoading(loading, setMeasure);
  // Text typed before hydration is in the DOM but not in state (#47): take it in once mounted.
  useEffect(() => {
    const typed = ref.current!.value;
    if (typed === '') return;
    startLoading(loading, setMeasure);
    setTextState(typed);
    ref.current!.style.height = `${ref.current!.scrollHeight}px`;
  }, []);
  const { weighted, remaining, postable: textPostable } = (measure ?? unmeasured)(text);
  // Images alone may be posted (#25); nothing is sent while one is still uploading.
  const count = attachments?.count ?? 0;
  const postable = (textPostable || (text === '' && count > 0)) && (attachments?.ready ?? true);
  const state = remaining < 0 ? 'over' : remaining <= 20 ? 'warning' : 'normal';

  const submit = () =>
    startTransition(async () => {
      // Offline, the request itself fails: say so and keep what was written (#70).
      const result = await settle(action(text, attachments?.media ?? []), {
        ok: false,
        message: OFFLINE_MESSAGE,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setText('');
      attachments?.clear();
      setError(null);
      ref.current!.style.height = ''; // the textarea is mounted while its form submits
      onPosted?.(result.id);
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
        autoFocus={autoFocus}
        rows={1}
        value={text}
        onFocus={loadMeasure}
        onChange={(event) => {
          loadMeasure();
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
