// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Post } from '../model/types';
import { MainPost } from './main-post';
import { PostCard } from './post-card';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const post: Post = {
  id: '123',
  author: { username: 'taro', name: '太郎', avatarUrl: null },
  text: '本文',
  createdAt: '2026-11-18T06:04:00.000Z',
  media: [],
  counts: { replies: 3, reposts: 0, likes: 12_345, bookmarks: 0, views: 0 },
  viewer: { liked: false, reposted: false, bookmarked: false, isAuthor: true },
  repostedBy: null,
  replyTo: { username: 'hana' },
  quoted: null,
};

describe('MainPost（#20: 詳細の本体）', () => {
  it('「投稿の本体」の article に、17px の本文・絶対の時刻・数・メニューを出す', () => {
    render(<MainPost post={post} menu={<button type="button">メニュー</button>} />);
    const main = screen.getByRole('article', { name: '投稿の本体' });
    expect(within(main).getByText('本文').closest('p')).toHaveClass('text-body-lg');
    expect(within(main).getByText('午後3:04 · 2026年11月18日').tagName).toBe('TIME');
    expect(main).toHaveTextContent('返信先: @hana');
    expect(main).toHaveTextContent('1.2万');
    expect(within(main).getByRole('button', { name: 'メニュー' })).toBeInTheDocument();
  });
});

describe('PostCard の connector（スレッドの線）', () => {
  it('connector を渡すと、アバターの下に縦の線を出す', () => {
    const { container, rerender } = render(<PostCard post={post} now={new Date()} connector />);
    expect(container.querySelector('[data-thread-line]')).toHaveClass('w-0.5');
    rerender(<PostCard post={post} now={new Date()} />);
    expect(container.querySelector('[data-thread-line]')).toBeNull();
  });
});
