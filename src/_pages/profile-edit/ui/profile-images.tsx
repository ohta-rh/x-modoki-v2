'use client';

import { useState } from 'react';
import { ProfileImagePicker } from '@/features/media-upload';

export type ProfileImages = { avatarUrl: string | null; bannerUrl: string | null };

type Choice = { id: string | null; busy: boolean };
const NONE: Choice = { id: null, busy: false };

/**
 * The banner with the avatar over its corner, as on the profile (#25): what the profile editor
 * shows above its fields, and the upload IDs it saves.
 */
export function useProfileImages({ avatarUrl, bannerUrl }: ProfileImages) {
  const [avatar, setAvatar] = useState(NONE);
  const [banner, setBanner] = useState(NONE);
  return {
    node: (
      <div className="relative -mx-4 -mt-3 mb-12">
        <ProfileImagePicker kind="banner" currentUrl={bannerUrl} onChange={setBanner} />
        <div className="absolute -bottom-12 left-4">
          <ProfileImagePicker kind="avatar" currentUrl={avatarUrl} onChange={setAvatar} />
        </div>
      </div>
    ),
    ids: {
      ...(avatar.id === null ? {} : { avatarId: avatar.id }),
      ...(banner.id === null ? {} : { bannerId: banner.id }),
    },
    busy: avatar.busy || banner.busy,
  };
}
