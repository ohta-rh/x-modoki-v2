'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import type { CreatePostActionResult } from '@/features/post-compose';
import { PageHeader } from '@/widgets/app-shell';
import { ComposerDialog, ComposerScreen } from '@/widgets/composer-modal';

type Props = {
  username: string;
  action: (text: string, media: { id: string; alt: string }[]) => Promise<CreatePostActionResult>;
};

/** Over the current screen (routing.md 3): closing or posting goes back to it. */
export function ComposeDialog(props: Props) {
  const router = useRouter();
  return <ComposerDialog {...props} onClose={() => router.back()} />;
}

/** Opened directly: posting opens the home timeline, where the post now is. */
export function ComposeScreen(props: Props) {
  const router = useRouter();
  return (
    <>
      <PageHeader title="ポストする" />
      <ComposerScreen {...props} onPosted={() => router.push('/home' as Route)} />
    </>
  );
}
