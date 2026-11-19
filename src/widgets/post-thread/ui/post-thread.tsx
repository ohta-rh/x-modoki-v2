'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  MainPost,
  PostCard,
  type PostDetail,
  removePostFromCaches,
  updatePostInCaches,
} from '@/entities/post';
import { ComposeBox, type CreatePostActionResult } from '@/features/post-compose';
import { type DeletePostActionResult, DeletePostMenu } from '@/features/post-delete';

type Props = {
  detail: PostDetail;
  now: string;
  signedIn: boolean;
  replyAction: (text: string, replyToId: string) => Promise<CreatePostActionResult>;
  deleteAction: (postId: string) => Promise<DeletePostActionResult>;
  /** The reply list, composed by the page (a widget cannot import another widget). */
  replies: ReactNode;
  /** The reply list's query key, reloaded after a reply. */
  repliesKey: readonly string[];
  /** The main post's like / bookmark controls, composed by the page (#21). */
  mainActions?: ReactNode;
};

/**
 * A post's thread (#20): the posts above it joined by a line (a deleted one as a mark), the post,
 * the reply composer for signed-in users, and the replies, oldest first.
 */
export function PostThread({
  detail,
  now,
  signedIn,
  replyAction,
  deleteAction,
  replies,
  repliesKey,
  mainActions,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { post } = detail;
  const date = new Date(now);
  return (
    <>
      {detail.ancestors.map((item) =>
        'deleted' in item ? (
          <p key={item.id} className="relative px-4 py-3 text-body text-text-muted">
            このポストは削除されました
          </p>
        ) : (
          <PostCard key={item.id} post={item} now={date} label="親の投稿" connector />
        ),
      )}
      <MainPost
        post={post}
        now={date}
        actions={mainActions}
        menu={
          post.viewer.isAuthor ? (
            <DeletePostMenu
              postId={post.id}
              action={deleteAction}
              // Replace, not push, and out of every list: Back must not bring it back (#68).
              onDeleted={() => {
                removePostFromCaches(queryClient, post.id);
                // A reply: its parent has one fewer in the lists, and its page in the history
                // is read again rather than shown as it was (#78).
                const parent = detail.ancestors.at(-1);
                if (parent && !('deleted' in parent)) {
                  updatePostInCaches(queryClient, parent.id, (target) => ({
                    ...target,
                    counts: { ...target.counts, replies: Math.max(target.counts.replies - 1, 0) },
                  }));
                }
                router.replace('/home');
                router.refresh();
              }}
            />
          ) : undefined
        }
      />
      {signedIn ? (
        <ComposeBox
          label="返信の本文"
          submitLabel="返信"
          placeholder="返信をポスト"
          action={(text) => replyAction(text, post.id)}
          onPosted={() => {
            void queryClient.resetQueries({ queryKey: repliesKey });
            // The lists hold this post too: their card shows the new count on Back (#69).
            updatePostInCaches(queryClient, post.id, (target) => ({
              ...target,
              counts: { ...target.counts, replies: target.counts.replies + 1 },
            }));
            // The post's reply count is server data: read the page again.
            router.refresh();
          }}
        />
      ) : null}
      <section aria-label="返信">{replies}</section>
    </>
  );
}
