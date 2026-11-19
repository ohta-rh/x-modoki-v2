'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ImageAttachments, useImageAttachments } from '@/features/media-upload';
import {
  clearDraft,
  ComposeBox,
  type CreatePostActionResult,
  readDraft,
  saveDraft,
  subscribeDraft,
} from '@/features/post-compose';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/kit';
import { toast } from '@/shared/ui/toast';
import { COMPOSE_PATH } from '@/shared/config';

type Action = (
  text: string,
  media: { id: string; alt: string }[],
) => Promise<CreatePostActionResult>;

type ComposerProps = {
  username: string;
  action: Action;
  onTextChange?: (text: string, images: number) => void;
  onPosted: () => void;
};

/**
 * The composer with images (#25) and the saved draft (#28). The draft lives in this browser only,
 * so it is unknown while rendering on the server (null) and the box appears once it is read. The
 * box is keyed by the draft: when Next.js shows a screen it kept hidden (React Activity), a draft
 * saved, discarded or posted since then gives a fresh box holding it.
 */
function Composer(props: ComposerProps) {
  const draft = useSyncExternalStore(subscribeDraft, readDraft, () => null);
  if (draft === null) return null;
  return <ComposerBody key={draft} draft={draft} {...props} />;
}

/** A post clears the draft, reloads the timelines and says so in a toast linking to the post. */
function ComposerBody({
  draft,
  username,
  action,
  onTextChange,
  onPosted,
}: ComposerProps & { draft: string }) {
  const queryClient = useQueryClient();
  const attachments = useImageAttachments();
  const [text, setText] = useState(draft);
  useEffect(() => onTextChange?.(text, attachments.count), [onTextChange, text, attachments.count]);
  return (
    <ComposeBox
      action={action}
      initialText={draft}
      autoFocus
      onTextChange={setText}
      attachments={{ ...attachments, node: <ImageAttachments attachments={attachments} /> }}
      onPosted={(id) => {
        clearDraft();
        void queryClient.resetQueries({ queryKey: ['timeline'] });
        toast.add({
          title: 'ポストを送信しました',
          // A link, not the toast's action button: it goes to the post (ui-ux.md 7).
          description: (
            <Link
              href={`/${username}/status/${id}` as Route}
              className="font-bold text-brand hover:underline"
            >
              表示
            </Link>
          ),
        });
        onPosted();
      }}
    />
  );
}

type DialogProps = { username: string; action: Action; onClose: () => void };

/**
 * /compose/post over the current screen (#28): closing with something written asks whether to
 * keep it as a draft.
 */
export function ComposerDialog({ username, action, onClose }: DialogProps) {
  // Where focus was before opening. Leaving is a route change that removes the dialog rather than
  // closing it, so focus is put back by hand; Safari focuses no link on a click, so then it goes
  // to the post button on screen.
  const [opener] = useState(() => document.activeElement);
  useEffect(
    () => () => {
      const back =
        opener instanceof HTMLElement &&
        opener !== document.body &&
        opener.getClientRects().length > 0
          ? opener
          : [...document.querySelectorAll<HTMLElement>(`a[href="${COMPOSE_PATH}"]`)].find(
              (link) => link.getClientRects().length > 0,
            );
      back?.focus();
    },
    [opener],
  );
  const [content, setContent] = useState({ text: '', images: 0 });
  const [asking, setAsking] = useState(false);
  // The answer, kept until the question has closed. A ref, not state: Next.js may show this
  // dialog again with its state (React Activity), and an old answer must not close it then.
  const answered = useRef(false);
  const dirty = content.text !== '' || content.images > 0;
  // A post on its way: closing now would leave twice, once now and once when it is sent (review 1).
  const sending = useRef(false);
  const send: Action = async (text, media) => {
    sending.current = true;
    try {
      return await action(text, media);
    } finally {
      sending.current = false;
    }
  };
  // The question closes first; the composer goes once it has: leaving with both dialogs still
  // open left the screen behind hidden from assistive technology.
  const answer = (choice: 'keep' | 'discard') => {
    if (choice === 'keep') saveDraft(content.text);
    else clearDraft();
    answered.current = true;
    setAsking(false);
  };
  return (
    <>
      <Dialog
        open
        onOpenChange={() => {
          if (sending.current) return;
          if (!dirty) {
            onClose();
            return;
          }
          answered.current = false;
          setAsking(true);
        }}
      >
        <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-card p-0 pt-10 sm:max-w-[600px]">
          <DialogTitle className="sr-only">ポストする</DialogTitle>
          <Composer
            username={username}
            action={send}
            onTextChange={(text, images) =>
              setContent((was) =>
                was.text === text && was.images === images ? was : { text, images },
              )
            }
            onPosted={onClose}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={asking}
        onOpenChange={setAsking}
        onOpenChangeComplete={(open) => {
          if (!open && answered.current) onClose();
        }}
      >
        <DialogContent
          role="alertdialog"
          showCloseButton={false}
          className="max-w-80 rounded-card p-8"
        >
          {/* Only the text is kept (ui-ux.md 7): with no text there is nothing to save. */}
          {content.text !== '' ? (
            <>
              <DialogTitle className="text-title font-bold">ポストを保存しますか？</DialogTitle>
              <DialogDescription className="text-text-muted">
                保存すると、次に開いたときに本文の続きから書けます（このブラウザの中だけ。画像は保存されません）。
              </DialogDescription>
              <Button className="h-11 w-full" onClick={() => answer('keep')}>
                保存
              </Button>
            </>
          ) : (
            <>
              <DialogTitle className="text-title font-bold">ポストを破棄しますか？</DialogTitle>
              <DialogDescription className="text-text-muted">
                画像は保存されません。
              </DialogDescription>
            </>
          )}
          <Button
            variant="outline"
            className="h-11 w-full text-danger"
            onClick={() => answer('discard')}
          >
            破棄
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** /compose/post opened directly (reload, shared URL): the same composer, in the page. */
export function ComposerScreen(props: { username: string; action: Action; onPosted: () => void }) {
  return <Composer {...props} />;
}
