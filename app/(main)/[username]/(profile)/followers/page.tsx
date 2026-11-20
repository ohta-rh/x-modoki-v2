import { Suspense } from 'react';
import { FollowListPage } from '@/_pages/follow-list';
import { loadFollowList } from '@/_pages/follow-list/index.server';

async function List({ params }: Pick<PageProps<'/[username]/followers'>, 'params'>) {
  const { username } = await params;
  return <FollowListPage {...await loadFollowList(username, 'followers')} />;
}

export default function Page({ params }: PageProps<'/[username]/followers'>) {
  return (
    <Suspense>
      <List params={params} />
    </Suspense>
  );
}
