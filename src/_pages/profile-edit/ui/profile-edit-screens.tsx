'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import {
  ProfileEditForm,
  type ProfileInput,
  type UpdateProfileActionResult,
} from '@/features/profile-edit';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/kit';
import { PageHeader } from '@/widgets/app-shell';
import { type ProfileImages, useProfileImages } from './profile-images';

type Props = {
  username: string;
  initial: ProfileInput;
  images: ProfileImages;
  action: (input: ProfileInput) => Promise<UpdateProfileActionResult>;
};

/** Over the current screen (routing.md 3): closing or saving goes back to it. */
export function ProfileEditDialog({ initial, images, action }: Props) {
  const router = useRouter();
  const pickers = useProfileImages(images);
  return (
    <Dialog open onOpenChange={() => router.back()}>
      <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-card p-0 sm:max-w-[600px]">
        <DialogTitle className="px-4 pt-4 text-title font-bold">プロフィールを編集</DialogTitle>
        <ProfileEditForm
          initial={initial}
          action={action}
          images={pickers}
          onSaved={() => {
            router.back();
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Opened directly (reload, shared URL): the same form as a page; saving opens the profile and reads the shell again. */
export function ProfileEditScreen({ username, initial, images, action }: Props) {
  const router = useRouter();
  const pickers = useProfileImages(images);
  return (
    <>
      <PageHeader title="プロフィールを編集" />
      <ProfileEditForm
        initial={initial}
        action={action}
        images={pickers}
        onSaved={() => {
          router.push(`/${username}` as Route);
          // The shell's account menu (name, avatar) lives in the layout, which a push keeps.
          router.refresh();
        }}
      />
    </>
  );
}
