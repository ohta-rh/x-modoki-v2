import type { PostDetail } from '@/entities/post';
import { createReplyAction } from '@/features/post-compose/index.server';
import { deletePostAction } from '@/features/post-delete/index.server';
import { PageHeader } from '@/widgets/app-shell';
import { PostThread } from '@/widgets/post-thread';
import { PostFeed } from '@/widgets/timeline-feed';

type Props = { detail: PostDetail; now: string; signedIn: boolean };

/** /{username}/status/{id}: the post and its thread (#20). */
export function PostDetailPage({ detail, now, signedIn }: Props) {
  const repliesKey = ['replies', detail.post.id];
  return (
    <>
      <PageHeader title="ポスト" />
      <PostThread
        key={detail.post.id}
        detail={detail}
        now={now}
        signedIn={signedIn}
        replyAction={createReplyAction}
        deleteAction={deletePostAction}
        repliesKey={repliesKey}
        replies={
          <PostFeed
            queryKey={repliesKey}
            endpoint={`/api/posts/${detail.post.id}/replies`}
            firstPage={detail.replies}
            now={now}
            deleteAction={deletePostAction}
            emptyText="まだ返信がありません"
          />
        }
      />
    </>
  );
}
