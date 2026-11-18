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

type Props = {
  username: string;
  initial: ProfileInput;
  action: (input: ProfileInput) => Promise<UpdateProfileActionResult>;
};

/** Over the current screen (routing.md 3): closing or saving goes back to it. */
export function ProfileEditDialog({ initial, action }: Props) {
  const router = useRouter();
  return (
    <Dialog open onOpenChange={() => router.back()}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-card p-0 sm:max-w-[600px]">
        <DialogTitle className="px-4 pt-4 text-title font-bold">プロフィールを編集</DialogTitle>
        <ProfileEditForm
          initial={initial}
          action={action}
          onSaved={() => {
            router.back();
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Opened directly (reload, shared URL): the same form as a page; saving opens the profile. */
export function ProfileEditScreen({ username, initial, action }: Props) {
  const router = useRouter();
  return (
    <>
      <PageHeader title="プロフィールを編集" />
      <ProfileEditForm
        initial={initial}
        action={action}
        onSaved={() => router.push(`/${username}` as Route)}
      />
    </>
  );
}
