import type { Route } from 'next';
import Link from 'next/link';
import { cn } from '@/shared/lib/cn';
import type { Post } from '../model/types';

type Props = {
  media: Post['media'];
  /** The post's URL: each image then opens the viewer at `{photos}/photo/{n}` (#25). */
  photos?: string;
  /** Near the top of a list: read at once and first, it is likely the page's largest paint (#32). */
  eager?: boolean;
};

const GRID = [
  '',
  'grid-cols-2 aspect-video',
  'grid-cols-2 grid-rows-2 aspect-video',
  'grid-cols-2 grid-rows-2 aspect-video',
];

/**
 * A post's images (#25, ui-ux.md 5): one keeps its own ratio; two side by side; three as one large
 * on the left and two small on the right; four in a 2×2 grid. 16px corners, 2px gaps.
 */
export function PostMedia({ media, photos, eager = false }: Props) {
  if (media.length === 0) return null;
  return (
    <div
      data-testid="post-media"
      className={cn(
        'mt-3 overflow-hidden rounded-2xl border border-line',
        media.length > 1 && 'grid gap-0.5',
        GRID[media.length - 1],
      )}
    >
      {media.map((image, index) => {
        const picture = (
          // eslint-disable-next-line @next/next/no-img-element -- served by the media host (ADR-0008), sized by its box
          <img
            src={image.url}
            alt={image.alt}
            width={image.width}
            height={image.height}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : undefined}
            className="size-full object-cover"
          />
        );
        return (
          <div
            key={image.url}
            className={cn(
              'min-h-0 overflow-hidden',
              media.length === 3 && index === 0 && 'row-span-2',
              // One image keeps its ratio, up to a height (ui-ux.md 5): a tall one is cropped.
              media.length === 1 && 'max-h-[510px]',
            )}
            style={
              media.length === 1 ? { aspectRatio: `${image.width} / ${image.height}` } : undefined
            }
          >
            {photos === undefined ? (
              picture
            ) : (
              <Link
                href={`${photos}/photo/${index + 1}` as Route}
                scroll={false}
                aria-label={`${index + 1} 枚目の画像`}
                className="block size-full"
              >
                {picture}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
