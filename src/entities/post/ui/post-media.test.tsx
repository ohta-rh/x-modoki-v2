// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
import type { Post } from '../model/types';
import { MainPost } from './main-post';
import { PostCard } from './post-card';
import { PostMedia } from './post-media';

const image = (n: number, width = 1200, height = 675) => ({
  url: `https://media.test/${n}.webp`,
  width,
  height,
  alt: n === 1 ? '一枚目' : '',
});
const show = (media: Post['media']) => render(<PostMedia media={media} />);

describe('PostMedia（#25、ui-ux.md の 5 節）', () => {
  it('1 枚は元の比率で、幅・高さ・代替テキスト付きの <img>。角 16px', () => {
    show([image(1, 800, 600)]);
    const grid = screen.getByTestId('post-media');
    expect(grid).toHaveClass('rounded-2xl', 'overflow-hidden');
    const img = screen.getByRole('img', { name: '一枚目' });
    expect(img).toHaveAttribute('width', '800');
    expect(img).toHaveAttribute('height', '600');
    expect(img).toHaveAttribute('src', 'https://media.test/1.webp');
    expect(grid.firstElementChild).toHaveStyle({ aspectRatio: '800 / 600' });
  });

  it('2 枚は左右、3 枚は左に大 1 と右に小 2、4 枚は 2×2。すき間は 2px', () => {
    const { unmount } = show([image(1), image(2)]);
    expect(screen.getByTestId('post-media')).toHaveClass('grid', 'grid-cols-2', 'gap-0.5');
    unmount();
    const three = show([image(1), image(2), image(3)]);
    const cells = screen.getByTestId('post-media').children;
    expect(cells[0]).toHaveClass('row-span-2');
    expect(screen.getByTestId('post-media')).toHaveClass('grid-rows-2');
    three.unmount();
    show([image(1), image(2), image(3), image(4)]);
    expect(screen.getByTestId('post-media')).toHaveClass('grid-cols-2', 'grid-rows-2');
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByTestId('post-media').querySelectorAll('img')).toHaveLength(4);
  });

  it('画像が無ければ何も出さない', () => {
    const { container } = show([]);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('カードと詳細の画像（#25）', () => {
  const post: Post = {
    id: '1',
    author: { username: 'taro', name: '太郎', avatarUrl: null },
    text: '写真',
    createdAt: '2026-11-18T03:00:00.000Z',
    media: [image(1)],
    counts: { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 },
    viewer: { liked: false, reposted: false, bookmarked: false, isAuthor: false },
    repostedBy: null,
    replyTo: null,
    quoted: null,
  };

  it('PostCard と MainPost が本文の下に画像を出す', () => {
    const { unmount } = render(<PostCard post={post} now={new Date('2026-11-18T03:00:00.000Z')} />);
    expect(screen.getByRole('img', { name: '一枚目' })).toBeInTheDocument();
    unmount();
    render(<MainPost post={post} now={new Date('2026-11-18T03:00:00.000Z')} />);
    expect(screen.getByRole('img', { name: '一枚目' })).toBeInTheDocument();
  });
});
