import { Suspense } from 'react';
import { ProfileEditModal } from '@/_pages/profile-edit';
import { loadProfileEdit } from '@/_pages/profile-edit/index.server';

async function Edit() {
  return <ProfileEditModal {...await loadProfileEdit()} />;
}

export default function Page() {
  return (
    <Suspense>
      <Edit />
    </Suspense>
  );
}
