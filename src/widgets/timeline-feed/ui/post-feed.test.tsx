// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Post } from '@/entities/post';
import { toast } from '@/shared/ui/kit';
import type { ReactionAction } from '../lib/use-reaction';
import { PostFeed } from './post-feed';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

const post = (id: number, isAuthor: boolean): Post => ({
  id: String(id),
  author: { username: 'taro', name: '太郎', avatarUrl: null },
  text: `投稿 ${id}`,
  createdAt: '2026-11-18T03:00:00.000Z',
  media: [],
  counts: { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 },
  viewer: { liked: false, reposted: false, bookmarked: false, isAuthor },
  repostedBy: null,
  replyTo: null,
  quoted: null,
});

describe('PostFeed', () => {
  it('自分の投稿だけに削除のメニューを付け、消したら一覧を読み直す', async () => {
    const fetchSpy = vi.fn(async () =>
      Response.json({ items: [post(2, false)], nextCursor: null }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const deleteAction = vi.fn(async () => ({ ok: true as const }));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PostFeed
          queryKey={['replies', '1']}
          endpoint="/api/posts/1/replies"
          firstPage={{ items: [post(1, true), post(2, false)], nextCursor: null }}
          now="2026-11-18T03:00:00.000Z"
          deleteAction={deleteAction}
        />
      </QueryClientProvider>,
    );
    const [mine, theirs] = screen.getAllByRole('article');
    expect(within(theirs).queryByRole('button', { name: 'もっと見る' })).toBeNull();
    await userEvent.click(within(mine).getByRole('button', { name: 'もっと見る' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: '削除' }));
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '削除' }),
    );
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1));
    expect(fetchSpy).toHaveBeenCalledWith('/api/posts/1/replies?cursor=');
    // Counts shown outside the list (the parent's replies) are server data: read the page again.
    expect(refresh).toHaveBeenCalled();
  });
});

describe('PostFeed のいいね・ブックマーク（#21）', () => {
  const setup = (likeAction: ReactionAction, bookmarkAction: ReactionAction = vi.fn()) => {
    const client = new QueryClient();
    // The same post is also in another list: both change together.
    client.setQueryData(['timeline', 'for-you'], {
      pages: [{ items: [post(1, false)], nextCursor: null }],
      pageParams: [''],
    });
    render(
      <QueryClientProvider client={client}>
        <PostFeed
          queryKey={['timeline', 'following']}
          endpoint="/api/timeline/following"
          firstPage={{ items: [post(1, false)], nextCursor: null }}
          now="2026-11-18T03:00:00.000Z"
          likeAction={likeAction}
          bookmarkAction={bookmarkAction}
        />
      </QueryClientProvider>,
    );
    return client;
  };
  const otherList = (client: QueryClient) =>
    client.getQueryData<{ pages: { items: Post[] }[] }>(['timeline', 'for-you'])!.pages[0].items[0];

  it('押した直後に色と数が変わり（ほかの一覧も）、サーバーの数で落ち着く。もう一度押すと取り消す', async () => {
    let resolve: (value: { ok: true; count: number }) => void = () => undefined;
    const likeAction = vi.fn(
      () => new Promise<{ ok: true; count: number }>((done) => (resolve = done)),
    );
    const client = setup(likeAction);
    const like = screen.getByRole('button', { name: 'いいね' });
    await userEvent.click(like);
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like).toHaveTextContent('1');
    expect(otherList(client).viewer.liked).toBe(true);
    expect(likeAction).toHaveBeenCalledWith('1', true);
    resolve({ ok: true, count: 5 });
    await waitFor(() => expect(like).toHaveTextContent('5'));
    likeAction.mockResolvedValueOnce({ ok: true, count: 4 } as never);
    await userEvent.click(like);
    expect(likeAction).toHaveBeenLastCalledWith('1', false);
    await waitFor(() => expect(like).toHaveAttribute('aria-pressed', 'false'));
  });

  it('失敗したら元に戻し、トーストで知らせる（投げた場合も）', async () => {
    const add = vi.spyOn(toast, 'add');
    const likeAction = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: 'この投稿は見つかりません' })
      .mockRejectedValueOnce(new Error('network'));
    const client = setup(likeAction);
    const like = screen.getByRole('button', { name: 'いいね' });
    await userEvent.click(like);
    await waitFor(() => expect(like).toHaveAttribute('aria-pressed', 'false'));
    expect(otherList(client).counts.likes).toBe(0);
    expect(add).toHaveBeenCalledWith({ title: 'いいねできませんでした' });
    await userEvent.click(like);
    await waitFor(() => expect(add).toHaveBeenCalledTimes(2));
    expect(like).toHaveAttribute('aria-pressed', 'false');
  });

  it('ブックマークも同じ: 押した直後に変わり、失敗したら戻してトースト', async () => {
    const add = vi.spyOn(toast, 'add');
    const bookmarkAction = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, count: 1 })
      .mockResolvedValueOnce({ ok: false, message: 'ログインしてください' });
    const client = setup(vi.fn(), bookmarkAction);
    const bookmark = screen.getByRole('button', { name: 'ブックマーク' });
    await userEvent.click(bookmark);
    expect(bookmark).toHaveAttribute('aria-pressed', 'true');
    expect(otherList(client).viewer.bookmarked).toBe(true);
    await waitFor(() => expect(otherList(client).counts.bookmarks).toBe(1));
    await userEvent.click(bookmark);
    await waitFor(() =>
      expect(add).toHaveBeenCalledWith({ title: 'ブックマークを変えられませんでした' }),
    );
    expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  });
});
