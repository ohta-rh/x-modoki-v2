import { Suspense } from 'react';
import { ProfilePage } from '@/_pages/profile';
import { loadProfilePage } from '@/_pages/profile/index.server';

async function Profile({ params }: Pick<PageProps<'/[username]/media'>, 'params'>) {
  const { username } = await params;
  return <ProfilePage {...await loadProfilePage(username, 'media')} />;
}

export default function Page({ params }: PageProps<'/[username]/media'>) {
  return (
    <Suspense>
      <Profile params={params} />
    </Suspense>
  );
}
