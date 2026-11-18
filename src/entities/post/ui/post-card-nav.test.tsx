// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createPortal } from 'react-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Post } from '../model/types';
import { PostCard } from './post-card';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const post: Post = {
  id: '123',
  author: { username: 'taro', name: '太郎', avatarUrl: null },
  text: '本文 #タグ',
  createdAt: '2026-11-18T02:59:00.000Z',
  media: [],
  counts: { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 },
  viewer: { liked: false, reposted: false, bookmarked: false, isAuthor: false },
  repostedBy: null,
  replyTo: null,
  quoted: null,
};
const now = new Date('2026-11-18T03:00:00.000Z');

beforeEach(() => push.mockReset());

describe('PostCard（#20: 詳細へのリンク）', () => {
  it('カードを押すと、その投稿の詳細へ進む', async () => {
    render(<PostCard post={post} now={now} />);
    await userEvent.click(screen.getByText('本文', { exact: false }));
    expect(push).toHaveBeenCalledWith('/taro/status/123');
  });

  it('カードの中のリンクとボタンを押したときは、詳細へ進まない', async () => {
    render(<PostCard post={post} now={now} menu={<button type="button">メニュー</button>} />);
    await userEvent.click(screen.getByRole('button', { name: 'メニュー' }));
    expect(push).not.toHaveBeenCalled();
    screen
      .getByRole('link', { name: '#タグ' })
      .addEventListener('click', (event) => event.preventDefault());
    await userEvent.click(screen.getByRole('link', { name: '#タグ' }));
    expect(push).not.toHaveBeenCalled();
  });

  it('返信には「返信先: @user」を出し、そのユーザーへのリンクにする', () => {
    render(<PostCard post={{ ...post, replyTo: { username: 'hana' } }} now={now} />);
    expect(screen.getByText('返信先:', { exact: false })).toHaveTextContent('返信先: @hana');
    expect(screen.getByRole('link', { name: '@hana' })).toHaveAttribute('href', '/hana');
  });

  it('label を渡すと、その名前の article になる（スレッドの親）', () => {
    render(<PostCard post={post} now={now} label="親の投稿" />);
    expect(screen.getByRole('article', { name: '親の投稿' })).toBeInTheDocument();
  });

  it('メニューが body に出した重ね（ダイアログの背景）を押しても、詳細へ進まない（#20 のレビュー）', async () => {
    render(
      <PostCard
        post={post}
        now={now}
        menu={createPortal(<div data-testid="backdrop" role="presentation" />, document.body)}
      />,
    );
    await userEvent.click(screen.getByTestId('backdrop'));
    expect(push).not.toHaveBeenCalled();
  });
});

describe('PostCard の操作の差し込み（#21）', () => {
  it('like と bookmark を渡すと、操作の列のいいねの場所と右端に出す', () => {
    render(
      <PostCard
        post={{ ...post, counts: { ...post.counts, likes: 3, views: 7 } }}
        now={now}
        like={<button type="button">いいねの部品</button>}
        bookmark={<button type="button">ブックマークの部品</button>}
      />,
    );
    const group = screen.getByRole('group', { name: '操作' });
    const names = [...group.children].map((child) => child.textContent);
    expect(names).toEqual([
      '返信 0',
      'リポスト 0',
      'いいねの部品',
      '表示 77',
      'ブックマークの部品',
    ]);
  });
});
