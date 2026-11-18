import { Suspense } from 'react';
import { PostDetailPage } from '@/_pages/post-detail';
import { loadPostDetail } from '@/_pages/post-detail/index.server';

async function Detail({ params }: Pick<PageProps<'/[username]/status/[postId]'>, 'params'>) {
  const { username, postId } = await params;
  return <PostDetailPage {...await loadPostDetail(username, postId)} />;
}

export default function Page({ params }: PageProps<'/[username]/status/[postId]'>) {
  return (
    <Suspense>
      <Detail params={params} />
    </Suspense>
  );
}
