import { Suspense } from 'react';
import { ProfilePage } from '@/_pages/profile';
import { loadProfilePage } from '@/_pages/profile/index.server';

async function Profile({ params }: Pick<PageProps<'/[username]/likes'>, 'params'>) {
  const { username } = await params;
  return <ProfilePage {...await loadProfilePage(username, 'likes')} />;
}

export default function Page({ params }: PageProps<'/[username]/likes'>) {
  return (
    <Suspense>
      <Profile params={params} />
    </Suspense>
  );
}
