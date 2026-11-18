// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Post, PostDetail } from '@/entities/post';
import { PostThread } from './post-thread';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

const post = (id: string, text: string, isAuthor = false): Post => ({
  id,
  author: { username: 'taro', name: '太郎', avatarUrl: null },
  text,
  createdAt: '2026-11-18T03:00:00.000Z',
  media: [],
  counts: { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 },
  viewer: { liked: false, reposted: false, bookmarked: false, isAuthor },
  repostedBy: null,
  replyTo: null,
  quoted: null,
});

const detail: PostDetail = {
  ancestors: [post('1', '最初'), { id: '2', deleted: true }],
  post: post('3', '本体', true),
  replies: { items: [post('4', '返信')], nextCursor: null },
};

const wrap = (children: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);
const actions = () => ({
  replyAction: vi.fn(async () => ({ ok: true as const, id: '1' })),
  deleteAction: vi.fn(async () => ({ ok: true as const })),
  repliesKey: ['replies', '3'],
  replies: <p>返信の一覧</p>,
});

describe('PostThread（#20）', () => {
  it('親（線つき）・削除された親・本体・返信の入力欄・返信の一覧の順で出す', () => {
    render(
      wrap(<PostThread detail={detail} now="2026-11-18T03:00:00.000Z" signedIn {...actions()} />),
    );
    const articles = screen.getAllByRole('article');
    expect(articles.map((article) => article.getAttribute('aria-label'))).toEqual([
      '親の投稿',
      '投稿の本体',
    ]);
    expect(articles[0].querySelector('[data-thread-line]')).not.toBeNull();
    expect(screen.getByText('このポストは削除されました')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '返信の本文' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: '返信' })).getByText('返信の一覧'),
    ).toBeInTheDocument();
  });

  it('ログインしていなければ、返信の入力欄を出さない', () => {
    render(
      wrap(
        <PostThread
          detail={detail}
          now="2026-11-18T03:00:00.000Z"
          signedIn={false}
          {...actions()}
        />,
      ),
    );
    expect(screen.queryByRole('textbox', { name: '返信の本文' })).toBeNull();
  });

  it('返信すると、本体の ID で返信し、渡されたキーの返信の一覧を読み直させる', async () => {
    const client = new QueryClient();
    const reset = vi.spyOn(client, 'resetQueries');
    const props = actions();
    render(
      <QueryClientProvider client={client}>
        <PostThread detail={detail} now="2026-11-18T03:00:00.000Z" signedIn {...props} />
      </QueryClientProvider>,
    );
    await userEvent.type(screen.getByRole('textbox', { name: '返信の本文' }), '新しい返信');
    await userEvent.click(screen.getByRole('button', { name: '返信' }));
    expect(props.replyAction).toHaveBeenCalledWith('新しい返信', '3');
    await waitFor(() => expect(reset).toHaveBeenCalledWith({ queryKey: ['replies', '3'] }));
    // The main post's reply count comes from the server: read the page again.
    expect(refresh).toHaveBeenCalled();
  });

  it('本体を削除したら、ホームへ移る', async () => {
    push.mockReset();
    render(
      wrap(<PostThread detail={detail} now="2026-11-18T03:00:00.000Z" signedIn {...actions()} />),
    );
    const main = screen.getByRole('article', { name: '投稿の本体' });
    await userEvent.click(within(main).getByRole('button', { name: 'もっと見る' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: '削除' }));
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '削除' }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/home'));
  });
});
