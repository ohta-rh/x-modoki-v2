// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PostCard } from './post-card';
import { QuotedCard } from './quoted-card';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const now = new Date('2026-11-18T03:00:00.000Z');
const quoted = {
  id: '7',
  author: { username: 'hana', name: '花', avatarUrl: null },
  text: '引用された本文',
  createdAt: '2026-11-18T02:00:00.000Z',
  quotesAnother: false,
};

describe('QuotedCard（#22）', () => {
  it('1px の線と 16px の角の入れ子で、作者・本文を出し、押すとその投稿へ', async () => {
    push.mockReset();
    render(<QuotedCard quoted={quoted} now={now} />);
    const card = screen.getByRole('article', { name: '引用した投稿' });
    // Its own background keeps the 1px line visible while the outer card is hovered (#22, Chrome).
    expect(card).toHaveClass('border', 'border-line', 'rounded-2xl', 'bg-bg');
    expect(card).toHaveTextContent('花@hana');
    expect(card).toHaveTextContent('引用された本文');
    await userEvent.click(screen.getByText('引用された本文'));
    expect(push).toHaveBeenCalledWith('/hana/status/7');
  });

  it('元も引用なら「ポストを表示」のリンク。削除されていれば印だけ', () => {
    const { rerender } = render(
      <QuotedCard quoted={{ ...quoted, quotesAnother: true }} now={now} />,
    );
    expect(screen.getByRole('link', { name: 'ポストを表示' })).toHaveAttribute(
      'href',
      '/hana/status/7',
    );
    push.mockReset();
    // The link does its own navigation; the card does not push on top of it.
    screen
      .getByRole('link', { name: 'ポストを表示' })
      .addEventListener('click', (event) => event.preventDefault());
    screen.getByRole('link', { name: 'ポストを表示' }).click();
    expect(push).not.toHaveBeenCalled();
    rerender(<QuotedCard quoted={{ id: '7', deleted: true }} now={now} />);
    expect(screen.getByRole('article', { name: '引用した投稿' })).toHaveTextContent(
      'このポストは削除されました',
    );
  });
});

describe('PostCard のリポストと引用（#22）', () => {
  const post = {
    id: '1',
    author: { username: 'taro', name: '太郎', avatarUrl: null },
    text: '意見',
    createdAt: '2026-11-18T02:59:00.000Z',
    media: [],
    counts: { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 },
    viewer: { liked: false, reposted: false, bookmarked: false, isAuthor: false },
    repostedBy: { username: 'jiro', name: '次郎', avatarUrl: null },
    replyTo: null,
    quoted,
  };

  it('上に「〜さんがリポスト」、本文の下に入れ子、操作の列にリポストの差し込み', () => {
    render(
      <PostCard post={post} now={now} repost={<button type="button">リポストの部品</button>} />,
    );
    const article = screen.getAllByRole('article')[0];
    expect(article).toHaveTextContent('次郎さんがリポスト');
    expect(screen.getByRole('link', { name: '次郎さんがリポスト' })).toHaveAttribute(
      'href',
      '/jiro',
    );
    expect(screen.getByRole('article', { name: '引用した投稿' })).toHaveTextContent(
      '引用された本文',
    );
    const group = screen.getByRole('group', { name: '操作' });
    expect([...group.children][1]).toHaveTextContent('リポストの部品');
  });
});
