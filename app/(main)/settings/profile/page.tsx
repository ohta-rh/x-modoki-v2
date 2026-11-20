import { Suspense } from 'react';
import { ProfileEditPage } from '@/_pages/profile-edit';
import { loadProfileEdit } from '@/_pages/profile-edit/index.server';

async function Edit() {
  return <ProfileEditPage {...await loadProfileEdit()} />;
}

export default function Page() {
  return (
    <Suspense>
      <Edit />
    </Suspense>
  );
}
