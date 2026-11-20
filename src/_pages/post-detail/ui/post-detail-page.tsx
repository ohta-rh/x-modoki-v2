import type { PostDetail } from '@/entities/post';
import { setBookmarkAction } from '@/features/post-bookmark/index.server';
import { createQuoteAction, createReplyAction } from '@/features/post-compose/index.server';
import { deletePostAction } from '@/features/post-delete/index.server';
import { setLikeAction } from '@/features/post-like/index.server';
import { setRepostAction } from '@/features/post-repost/index.server';
import { ViewCounter } from '@/features/post-view-count';
import { PageHeader } from '@/widgets/app-shell';
import { PostThread } from '@/widgets/post-thread';
import { PostFeed } from '@/widgets/timeline-feed';
import { MainPostReactions } from './main-post-reactions';
import { PhotoModal, PhotoOverDetail } from './post-photo';

type Props = { detail: PostDetail; now: string; signedIn: boolean; photo?: number | null };

/** /{username}/status/{id}: the post and its thread (#20); /photo/{n} adds the viewer on top (#25). */
export function PostDetailPage({ detail, now, signedIn, photo = null }: Props) {
  const repliesKey = ['replies', detail.post.id];
  return (
    <>
      <PageHeader title="ポスト" />
      <ViewCounter postId={detail.post.id} />
      {photo === null ? null : <PhotoOverDetail post={detail.post} photo={photo} />}
      <PostThread
        key={detail.post.id}
        detail={detail}
        now={now}
        signedIn={signedIn}
        replyAction={createReplyAction}
        deleteAction={deletePostAction}
        repliesKey={repliesKey}
        mainActions={
          signedIn ? (
            <MainPostReactions
              post={detail.post}
              likeAction={setLikeAction}
              bookmarkAction={setBookmarkAction}
            />
          ) : undefined
        }
        replies={
          <PostFeed
            queryKey={repliesKey}
            endpoint={`/api/posts/${detail.post.id}/replies`}
            firstPage={detail.replies}
            now={now}
            deleteAction={deletePostAction}
            likeAction={signedIn ? setLikeAction : undefined}
            bookmarkAction={signedIn ? setBookmarkAction : undefined}
            repostAction={signedIn ? setRepostAction : undefined}
            quoteAction={signedIn ? createQuoteAction : undefined}
            emptyText="まだ返信がありません"
          />
        }
      />
    </>
  );
}

/** /{username}/status/{id}/photo/{n} opened from another screen: only the viewer, over it (#25). */
export function PostPhotoModal({ detail, photo }: { detail: PostDetail; photo: number }) {
  return <PhotoModal post={detail.post} photo={photo} />;
}
