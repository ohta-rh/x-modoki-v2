// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
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
  links: [],
  createdAt: '2026-11-18T02:00:00.000Z',
  quotesAnother: false,
  media: [],
};

describe('QuotedCard（#22）', () => {
  it('引用した投稿の画像を、本文の下に順に出す。押すとその投稿へ（#115）', async () => {
    push.mockReset();
    render(
      <QuotedCard
        quoted={{
          ...quoted,
          media: [
            { url: 'https://m.example/a.webp', width: 30, height: 40, alt: '一枚目' },
            { url: 'https://m.example/b.webp', width: 10, height: 20, alt: '二枚目' },
          ],
        }}
        now={now}
      />,
    );
    const card = screen.getByRole('article', { name: '引用した投稿' });
    const images = within(card)
      .getAllByRole('img')
      .filter((img) => img.getAttribute('alt'));
    expect(images.map((img) => img.getAttribute('alt'))).toEqual(['一枚目', '二枚目']);
    expect(images[0]).toHaveAttribute('src', 'https://m.example/a.webp');
    // The images open the quoted post, not a photo viewer of the outer one.
    expect(within(card).queryByRole('link', { name: /一枚目/ })).toBeNull();
    await userEvent.click(images[0]);
    expect(push).toHaveBeenCalledWith('/hana/status/7');
  });

  it('画像が無ければ画像の枠を出さない', () => {
    render(<QuotedCard quoted={quoted} now={now} />);
    expect(screen.queryByTestId('post-media')).toBeNull();
  });

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

  // FR-CONV-09: 削除された元の投稿
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
    links: [],
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

describe('PostCard の固定（#23）', () => {
  it('pinned なら上に「固定」と出す', () => {
    render(
      <PostCard
        post={{
          id: '1',
          author: { username: 'taro', name: '太郎', avatarUrl: null },
          text: '固定した投稿',
          links: [],
          createdAt: '2026-11-18T02:59:00.000Z',
          media: [],
          counts: { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 },
          viewer: { liked: false, reposted: false, bookmarked: false, isAuthor: true },
          repostedBy: null,
          replyTo: null,
          quoted: null,
          pinned: true,
        }}
        now={now}
      />,
    );
    expect(screen.getByRole('article')).toHaveTextContent(/^固定/);
  });
});
