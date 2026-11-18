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

describe('PostFeed のリポストと引用（#22）', () => {
  const renderFeed = (repostAction: ReactionAction, quoteAction = vi.fn()) => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <PostFeed
          queryKey={['timeline', 'following']}
          endpoint="/api/timeline/following"
          firstPage={{ items: [post(1, false)], nextCursor: null }}
          now="2026-11-18T03:00:00.000Z"
          repostAction={repostAction}
          quoteAction={quoteAction}
        />
      </QueryClientProvider>,
    );
    return client;
  };

  it('メニューのリポストで、すぐに色と数が変わり、失敗したら戻してトースト', async () => {
    const add = vi.spyOn(toast, 'add');
    const repostAction = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, count: 1 })
      .mockResolvedValueOnce({ ok: false, message: 'この投稿は見つかりません' });
    renderFeed(repostAction);
    const repost = screen.getByRole('button', { name: 'リポスト' });
    await userEvent.click(repost);
    await userEvent.click(await screen.findByRole('menuitem', { name: 'リポスト' }));
    expect(repost).toHaveClass('text-repost');
    expect(repostAction).toHaveBeenCalledWith('1', true);
    await waitFor(() => expect(repost).toHaveTextContent('1'));
    await userEvent.click(repost);
    await userEvent.click(await screen.findByRole('menuitem', { name: 'リポストを取り消す' }));
    await waitFor(() => expect(add).toHaveBeenCalledWith({ title: 'リポストできませんでした' }));
    expect(repost).toHaveClass('text-repost');
  });

  it('引用で、入れ子のカード付きの入力欄が開き、投稿すると閉じて一覧を読み直す', async () => {
    const fetchSpy = vi.fn(async () => Response.json({ items: [], nextCursor: null }));
    vi.stubGlobal('fetch', fetchSpy);
    const quoteAction = vi.fn(async () => ({ ok: true as const }));
    renderFeed(vi.fn(), quoteAction);
    await userEvent.click(screen.getByRole('button', { name: 'リポスト' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: '引用' }));
    const dialog = within(await screen.findByRole('dialog', { name: '引用' }));
    expect(dialog.getByRole('article', { name: '引用した投稿' })).toHaveTextContent('投稿 1');
    await userEvent.type(dialog.getByRole('textbox', { name: '引用の本文' }), '意見');
    await userEvent.click(dialog.getByRole('button', { name: 'ポストする' }));
    expect(quoteAction).toHaveBeenCalledWith('意見', '1');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '引用' })).toBeNull());
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/timeline/following?cursor='));
  });

  it('引用の入力欄は Esc で閉じ、何も投稿しない', async () => {
    const quoteAction = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PostFeed
          queryKey={['timeline', 'following']}
          endpoint="/api/timeline/following"
          firstPage={{ items: [post(1, false)], nextCursor: null }}
          now="2026-11-18T03:00:00.000Z"
          repostAction={vi.fn()}
          quoteAction={quoteAction}
        />
      </QueryClientProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'リポスト' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: '引用' }));
    await screen.findByRole('dialog', { name: '引用' });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '引用' })).toBeNull());
    expect(quoteAction).not.toHaveBeenCalled();
  });

  it('元の投稿とそのリポストが同じ一覧にあっても、両方を出し、キーが重ならない', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const original = post(1, false);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PostFeed
          queryKey={['timeline', 'for-you']}
          endpoint="/api/timeline/for-you"
          firstPage={{
            items: [
              { ...original, repostedBy: { username: 'jiro', name: '次郎', avatarUrl: null } },
              original,
            ],
            nextCursor: null,
          }}
          now="2026-11-18T03:00:00.000Z"
        />
      </QueryClientProvider>,
    );
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});

describe('PostFeed の固定とプロフィールの一覧（#23）', () => {
  it('自分の投稿のメニューに固定を出し、固定したら一覧を読み直す。endpoint に ? があれば & でつなぐ', async () => {
    const fetchSpy = vi.fn(async () => Response.json({ items: [], nextCursor: null }));
    vi.stubGlobal('fetch', fetchSpy);
    const pinAction = vi.fn(async () => ({ ok: true as const }));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PostFeed
          queryKey={['profile', 'taro', 'posts']}
          endpoint="/api/users/taro/posts?tab=posts"
          firstPage={{ items: [post(1, true)], nextCursor: null }}
          now="2026-11-18T03:00:00.000Z"
          deleteAction={vi.fn()}
          pinAction={pinAction}
        />
      </QueryClientProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'もっと見る' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'プロフィールに固定する' }));
    expect(pinAction).toHaveBeenCalledWith('1', true);
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith('/api/users/taro/posts?tab=posts&cursor='),
    );
  });
});
