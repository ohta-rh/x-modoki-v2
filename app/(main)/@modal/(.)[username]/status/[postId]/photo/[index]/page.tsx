import { Suspense } from 'react';
import { PostPhotoModal } from '@/_pages/post-detail';
import { loadPostDetail } from '@/_pages/post-detail/index.server';

type Params = PageProps<'/[username]/status/[postId]/photo/[index]'>['params'];

async function Photo({ params }: { params: Params }) {
  const { username, postId, index } = await params;
  const { detail, photo } = await loadPostDetail(username, postId, index);
  return <PostPhotoModal detail={detail} photo={photo!} />;
}

export default function Page({ params }: PageProps<'/[username]/status/[postId]/photo/[index]'>) {
  return (
    <Suspense>
      <Photo params={params} />
    </Suspense>
  );
}
