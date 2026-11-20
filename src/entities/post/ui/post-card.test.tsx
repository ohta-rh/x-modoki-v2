// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { findLinks } from '@/shared/lib/text-parse';
import type { Post } from '../model/types';
import { PostCard } from './post-card';
import { PostText } from './post-text';

const post: Post = {
  id: '123',
  author: { username: 'taro', name: '太郎', avatarUrl: null },
  text: 'こんにちは',
  links: [],
  createdAt: '2026-11-18T02:59:00.000Z',
  media: [],
  counts: { replies: 2, reposts: 1, likes: 12_345, bookmarks: 0, views: 9_999 },
  viewer: { liked: false, reposted: false, bookmarked: false, isAuthor: false },
  repostedBy: null,
  replyTo: null,
  quoted: null,
};
const now = new Date('2026-11-18T03:00:00.000Z');

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('PostText（NFR-SEC-06）', () => {
  it('URL は外へのリンク、ハッシュタグとメンションはアプリの中のリンク', () => {
    const text = '見て https://example.com/a #タグ @Taro';
    render(<PostText text={text} links={findLinks(text)} />);
    const url = screen.getByRole('link', { name: 'https://example.com/a' });
    expect(url).toHaveAttribute('href', 'https://example.com/a');
    expect(url).toHaveAttribute('target', '_blank');
    expect(url).toHaveAttribute('rel', 'noopener noreferrer nofollow');
    expect(screen.getByRole('link', { name: '#タグ' })).toHaveAttribute(
      'href',
      '/search?q=%23%E3%82%BF%E3%82%B0',
    );
    expect(screen.getByRole('link', { name: '@Taro' })).toHaveAttribute('href', '/taro');
    for (const link of screen.getAllByRole('link')) expect(link).toHaveClass('text-brand');
  });

  // FR-VIEW-06: 自動のリンク
  it('T-05・T-06: <script> は文字のまま出し、javascript: はリンクにしない', () => {
    const text = '<script>alert(1)</script> javascript:alert(1)';
    const { container } = render(<PostText text={text} links={findLinks(text)} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container).toHaveTextContent('<script>alert(1)</script> javascript:alert(1)');
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('PostText のリンク（#32）', () => {
  // NFR-PERF-05: 本文の解析はサーバーで済ませ、ブラウザは渡されたリンクで切るだけ
  it('渡された links の所だけをリンクにし、本文を自分では解析しない', () => {
    const text = '#タグ と 後ろ';
    const { unmount } = render(<PostText text={text} links={[]} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(text)).toBeInTheDocument();
    unmount();
    render(<PostText text={text} links={[{ type: 'hashtag', start: 6, end: 8, href: '/x' }]} />);
    expect(screen.getByRole('link', { name: '後ろ' })).toHaveAttribute('href', '/x');
    expect(screen.getByRole('paragraph')).toHaveTextContent('#タグ と 後ろ');
  });

  it('一覧で本文を 8 行に切ったときは、切った後ろのリンクを出さない', () => {
    const text = ['#前', ...Array.from({ length: 8 }, (_, i) => `行 ${i}`), '#後ろ'].join('\n');
    const at = (tag: string) => ({ start: text.indexOf(tag), end: text.indexOf(tag) + tag.length });
    render(
      <PostCard
        post={{
          ...post,
          text,
          links: [
            { type: 'hashtag', ...at('#前'), href: '/before' },
            { type: 'hashtag', ...at('#後ろ'), href: '/after' },
          ],
        }}
        now={now}
      />,
    );
    expect(screen.getByRole('link', { name: '#前' })).toHaveAttribute('href', '/before');
    expect(screen.queryByRole('link', { name: '#後ろ' })).toBeNull();
  });
});

describe('PostCard（ui-ux.md の 5 節）', () => {
  // FR-VIEW-09: 投稿カードの並び
  it('アバター・名前・@ユーザー名・時刻・本文・操作の列の順で出す', () => {
    render(<PostCard post={post} now={now} />);
    const card = screen.getByRole('article');
    expect(within(card).getByRole('img', { name: '太郎' })).toBeInTheDocument();
    expect(card).toHaveTextContent(/太郎.*@taro.*·.*1分.*こんにちは/);
    expect(within(card).getByText('1分').closest('time')).toHaveAttribute(
      'dateTime',
      post.createdAt,
    );
    expect(within(card).getByRole('link', { name: '太郎' })).toHaveAttribute('href', '/taro');
  });

  it('操作の列は、返信・リポスト・いいね・表示回数を、読み上げでは「返信 2」の形、見た目では 5 節の形で出す（この PBI では押せない）', () => {
    render(<PostCard post={post} now={now} />);
    const actions = screen.getByRole('group', { name: '操作' });
    for (const [spoken, shown] of [
      ['返信 2', '2'],
      ['リポスト 1', '1'],
      ['いいね 12,345', '1.2万'],
      ['表示 9,999', '9,999'],
    ]) {
      const label = within(actions).getByText(spoken);
      expect(label).toHaveClass('sr-only');
      expect(label.nextElementSibling).toHaveAttribute('aria-hidden', 'true');
      expect(label.nextElementSibling).toHaveTextContent(shown);
    }
    expect(within(actions).queryByRole('button')).toBeNull();
  });

  it('数が 0 なら数字を出さない（読み上げは「返信 0」）', () => {
    render(<PostCard post={{ ...post, counts: { ...post.counts, replies: 0 } }} now={now} />);
    expect(screen.getByText('返信 0').nextElementSibling).toHaveTextContent('');
  });
});

describe('PostCard の長い本文（#28、ui-ux.md の 5 節）', () => {
  // FR-TL-09: 長い本文
  it('9 行以上は最初の 8 行だけを出し、詳細への「さらに表示」を出す。8 行までは出さない', () => {
    const long = Array.from({ length: 12 }, (_, i) => `行 ${i + 1}`).join('\n');
    const { unmount } = render(<PostCard post={{ ...post, text: long }} now={now} />);
    const article = screen.getByRole('article');
    expect(article).toHaveTextContent('行 8');
    expect(article).not.toHaveTextContent('行 9');
    expect(screen.getByRole('link', { name: 'さらに表示' })).toHaveAttribute(
      'href',
      '/taro/status/123',
    );
    unmount();
    render(<PostCard post={{ ...post, text: '行 1\n行 2' }} now={now} />);
    expect(screen.queryByRole('link', { name: 'さらに表示' })).toBeNull();
  });
});
