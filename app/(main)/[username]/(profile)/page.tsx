import { Suspense } from 'react';
import { ProfilePage } from '@/_pages/profile';
import { loadProfilePage } from '@/_pages/profile/index.server';

async function Profile({ params }: Pick<PageProps<'/[username]'>, 'params'>) {
  const { username } = await params;
  return <ProfilePage {...await loadProfilePage(username, 'posts')} />;
}

export default function Page({ params }: PageProps<'/[username]'>) {
  return (
    <Suspense>
      <Profile params={params} />
    </Suspense>
  );
}
