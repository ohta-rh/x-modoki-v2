import { Suspense } from 'react';
import { FollowListPage } from '@/_pages/follow-list';
import { loadFollowList } from '@/_pages/follow-list/index.server';

async function List({ params }: Pick<PageProps<'/[username]/following'>, 'params'>) {
  const { username } = await params;
  return <FollowListPage {...await loadFollowList(username, 'following')} />;
}

export default function Page({ params }: PageProps<'/[username]/following'>) {
  return (
    <Suspense>
      <List params={params} />
    </Suspense>
  );
}
