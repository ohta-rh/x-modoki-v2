'use client';

import { ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { prepareImage, uploadImage } from '../lib/prepare-image';

const MAX = 4;
const MAX_ALT = 1000;

type Item = { key: string; previewUrl: string; id: string | null; alt: string; failed: boolean };

/**
 * The images chosen for a post (#25): each is prepared and uploaded as soon as it is picked, so
 * posting only sends the media ids and their alternative texts.
 */
export function useImageAttachments() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const update = (key: string, change: Partial<Item>) =>
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...change } : item)),
    );
  const add = (files: File[]) => {
    // A choice with no file (cancelled, or a late change after the input was emptied) changes
    // nothing, the limit message included (#54).
    if (files.length === 0) return;
    const room = MAX - items.length;
    setError(files.length > room ? `画像は ${MAX} 枚までです` : null);
    for (const file of files.slice(0, room)) {
      const key = crypto.randomUUID();
      const item = { key, previewUrl: URL.createObjectURL(file), id: null, alt: '', failed: false };
      setItems((current) => [...current, item]);
      prepareImage(file, 'post')
        .then(uploadImage)
        .then(
          (id) => update(key, { id }),
          () => {
            update(key, { failed: true });
            setError('画像を送れませんでした');
          },
        );
    }
  };
  const remove = (key: string) =>
    setItems((current) => {
      // Removal comes from a rendered preview, so its item is there.
      URL.revokeObjectURL(current.find((item) => item.key === key)!.previewUrl);
      return current.filter((item) => item.key !== key);
    });
  return {
    items,
    error,
    add,
    remove,
    setAlt: (key: string, alt: string) => update(key, { alt }),
    clear: () => {
      for (const item of items) URL.revokeObjectURL(item.previewUrl);
      setItems([]);
      setError(null);
    },
    count: items.length,
    ready: items.every((item) => item.id !== null),
    media: items.flatMap((item) => (item.id ? [{ id: item.id, alt: item.alt }] : [])),
  };
}

export type ImageAttachmentsState = ReturnType<typeof useImageAttachments>;

/** The add-image button, the previews with their alt-text editor and remove buttons (#25). */
export function ImageAttachments({ attachments }: { attachments: ImageAttachmentsState }) {
  const [editing, setEditing] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  // Files chosen before hydration never reach onChange (as in #47): take them in once mounted.
  useEffect(() => {
    const chosen = input.current!.files!;
    if (chosen.length === 0) return;
    attachments.add([...chosen]);
    input.current!.value = '';
    // Only the files there at mount; later choices come through onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on mount
  }, []);
  const [draft, setDraft] = useState('');
  const full = attachments.count >= MAX;
  return (
    <div className="flex flex-col gap-2">
      {attachments.count > 0 ? (
        <div role="group" aria-label="添付した画像" className="grid grid-cols-2 gap-2">
          {attachments.items.map((item, index) => (
            <div key={item.key} className="relative overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview (blob: URL) */}
              <img
                src={item.previewUrl}
                alt={`${index + 1} 枚目の画像`}
                className={`aspect-video w-full object-cover ${item.failed ? 'opacity-40' : ''}`}
              />
              <button
                type="button"
                aria-label={`${index + 1} 枚目を外す`}
                onClick={() => attachments.remove(item.key)}
                className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`${index + 1} 枚目の代替テキスト`}
                onClick={() => {
                  setEditing(item.key);
                  setDraft(item.alt);
                }}
                className="absolute bottom-1 left-1 rounded bg-black/70 px-2 text-[13px] font-bold text-white"
              >
                ALT
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {editing ? (
        <div className="flex gap-2">
          <textarea
            aria-label="代替テキスト"
            maxLength={MAX_ALT}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-16 flex-1 rounded border border-line bg-transparent p-2 text-body"
          />
          <button
            type="button"
            onClick={() => {
              attachments.setAlt(editing, draft);
              setEditing(null);
            }}
            className="self-end rounded-full bg-text px-3 py-1 text-body font-bold text-bg"
          >
            代替テキストを保存
          </button>
        </div>
      ) : null}
      {attachments.error ? (
        <p role="alert" className="text-[13px] text-danger">
          {attachments.error}
        </p>
      ) : null}
      <label
        className={`inline-flex size-9 items-center justify-center rounded-full text-brand ${full ? 'opacity-50' : 'cursor-pointer hover:bg-brand/10'}`}
      >
        <ImagePlus aria-hidden="true" className="size-5" />
        <input
          ref={input}
          type="file"
          aria-label="画像を追加"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          disabled={full}
          className="sr-only"
          onChange={(event) => {
            attachments.add([...event.target.files!]);
            event.target.value = '';
          }}
        />
      </label>
    </div>
  );
}
