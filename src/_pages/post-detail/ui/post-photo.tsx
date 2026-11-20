'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import type { Post } from '@/entities/post';
import { PhotoViewer } from '@/widgets/photo-viewer';

type Props = { post: Post; photo: number };

const base = (post: Post) => `/${post.author.username}/status/${post.id}`;

/** Opened directly (reload, shared URL): over the post's detail; closing shows the detail. */
export function PhotoOverDetail({ post, photo }: Props) {
  const router = useRouter();
  return (
    <PhotoViewer
      media={post.media}
      base={base(post)}
      index={photo}
      onClose={() => router.replace(base(post) as Route, { scroll: false })}
    />
  );
}

/** Opened from another screen (routing.md 3): over it; closing goes back to it where it was. */
export function PhotoModal({ post, photo }: Props) {
  const router = useRouter();
  return (
    <PhotoViewer media={post.media} base={base(post)} index={photo} onClose={() => router.back()} />
  );
}
