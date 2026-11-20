import { Suspense } from 'react';
import { ProfilePage } from '@/_pages/profile';
import { loadProfilePage } from '@/_pages/profile/index.server';

async function Profile({ params }: Pick<PageProps<'/[username]/with_replies'>, 'params'>) {
  const { username } = await params;
  return <ProfilePage {...await loadProfilePage(username, 'with_replies')} />;
}

export default function Page({ params }: PageProps<'/[username]/with_replies'>) {
  return (
    <Suspense>
      <Profile params={params} />
    </Suspense>
  );
}
