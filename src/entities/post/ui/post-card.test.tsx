// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Post } from '../model/types';
import { PostCard } from './post-card';
import { PostText } from './post-text';

const post: Post = {
  id: '123',
  author: { username: 'taro', name: '太郎', avatarUrl: null },
  text: 'こんにちは',
  createdAt: '2026-11-18T02:59:00.000Z',
  media: [],
  counts: { replies: 2, reposts: 1, likes: 12_345, bookmarks: 0, views: 9_999 },
  viewer: { liked: false, reposted: false, bookmarked: false },
  repostedBy: null,
  replyTo: null,
  quoted: null,
};
const now = new Date('2026-11-18T03:00:00.000Z');

describe('PostText（NFR-SEC-06）', () => {
  it('URL は外へのリンク、ハッシュタグとメンションはアプリの中のリンク', () => {
    render(<PostText text="見て https://example.com/a #タグ @Taro" />);
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

  it('T-05・T-06: <script> は文字のまま出し、javascript: はリンクにしない', () => {
    const { container } = render(
      <PostText text={'<script>alert(1)</script> javascript:alert(1)'} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container).toHaveTextContent('<script>alert(1)</script> javascript:alert(1)');
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('PostCard（ui-ux.md の 5 節）', () => {
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
