'use client';

import { ImagePlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { prepareImage, uploadImage } from '../lib/prepare-image';

type Props = {
  kind: 'avatar' | 'banner';
  /** The image the profile has now, shown until another is chosen. */
  currentUrl: string | null;
  /** The chosen image's upload ID once it is sent; `busy` while it is being prepared and sent. */
  onChange: (state: { id: string | null; busy: boolean }) => void;
};

const TEXT = {
  avatar: { pick: 'アバターの画像を選ぶ', preview: '新しいアバター' },
  banner: { pick: 'バナーの画像を選ぶ', preview: '新しいバナー' },
};

/**
 * Chooses a new avatar or banner (#25): cropped in the browser to 400×400 or 1500×500
 * (ADR-0018), sent straight to storage, then handed over by its upload ID.
 */
export function ProfileImagePicker({ kind, currentUrl, onChange }: Props) {
  const [preview, setPreview] = useState<{ url: string; width: number; height: number } | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const text = TEXT[kind];
  const input = useRef<HTMLInputElement>(null);
  const choose = async (file: File) => {
    setFailed(false);
    onChange({ id: null, busy: true });
    try {
      const image = await prepareImage(file, kind);
      setPreview({
        url: URL.createObjectURL(image.blob),
        width: image.width,
        height: image.height,
      });
      onChange({ id: await uploadImage(image), busy: false });
    } catch {
      setFailed(true);
      onChange({ id: null, busy: false });
    }
  };
  // A file chosen before hydration never reaches onChange (as in #47): take it in once mounted.
  useEffect(() => {
    const chosen = input.current!.files![0];
    if (chosen) void choose(chosen);
    // Only the file there at mount; later choices come through onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on mount
  }, []);
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-line',
        kind === 'avatar' ? 'size-28 rounded-full border-4 border-bg' : 'aspect-[3/1] w-full',
      )}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local preview (blob:)
        <img
          src={preview.url}
          alt={text.preview}
          width={preview.width}
          height={preview.height}
          className="size-full object-cover"
        />
      ) : currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- served by the media host (ADR-0008)
        <img src={currentUrl} alt="" className="size-full object-cover" />
      ) : null}
      <label className="absolute inset-0 m-auto flex size-11 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/70 has-focus-visible:ring-2 has-focus-visible:ring-accent">
        <ImagePlus aria-hidden="true" className="size-5" />
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          aria-label={text.pick}
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void choose(file);
          }}
        />
      </label>
      {failed ? (
        <p
          role="alert"
          className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-center text-[13px] text-white"
        >
          画像を送れませんでした
        </p>
      ) : null}
    </div>
  );
}
