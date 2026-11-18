import type { ProfileInput } from '@/features/profile-edit';
import { updateProfileAction } from '@/features/profile-edit/index.server';
import { ProfileEditDialog, ProfileEditScreen } from './profile-edit-screens';
import type { ProfileImages } from './profile-images';

type Props = { username: string; initial: ProfileInput; images: ProfileImages };

/** /settings/profile over the current screen (@modal, routing.md 2). */
export function ProfileEditModal(props: Props) {
  return <ProfileEditDialog {...props} action={updateProfileAction} />;
}

/** /settings/profile opened directly. */
export function ProfileEditPage(props: Props) {
  return <ProfileEditScreen {...props} action={updateProfileAction} />;
}
