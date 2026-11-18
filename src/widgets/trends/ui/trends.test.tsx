// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Trends } from './trends';

// next/link, recording the prefetch prop on the anchor.
vi.mock('next/link', () => ({
  default: ({ prefetch, ...props }: { prefetch?: boolean } & React.ComponentProps<'a'>) => (
    <a data-prefetch={String(prefetch)} {...props} />
  ),
}));
const prefetchOf = (link: HTMLElement) =>
  link.getAttribute('data-prefetch') === 'true'
    ? true
    : link.getAttribute('data-prefetch') === 'false'
      ? false
      : undefined;

describe('Trends（#27）', () => {
  it('見出しと、ハッシュタグごとの検索へのリンクと投稿の数', () => {
    render(
      <Trends
        trends={[
          { tag: '猫', count: 12 },
          { tag: 'cats', count: 3 },
        ]}
      />,
    );
    const section = screen.getByRole('region', { name: 'いまどうしてる？' });
    const links = within(section).getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/search?q=%23%E7%8C%AB');
    expect(links[0]).toHaveTextContent('#猫');
    expect(links[0]).toHaveTextContent('12 件のポスト');
    expect(links[1]).toHaveAttribute('href', '/search?q=%23cats');
    // Not prefetched: a prefetch of /search?q=… was seen to stay open, so the page never went idle.
    expect(prefetchOf(links[0])).toBe(false);
  });

  it('無ければ、まだ無いと出す', () => {
    render(<Trends trends={[]} />);
    expect(screen.getByText('トレンドはまだありません')).toBeInTheDocument();
  });

  it('2 つ並べても見出しの id が重ならない（/explore では本文と右サイドバーの両方に出る、レビュー 2）', () => {
    const { container } = render(
      <>
        <Trends trends={[]} />
        <Trends trends={[]} />
      </>,
    );
    const ids = [...container.querySelectorAll('h2')].map((heading) => heading.id);
    expect(new Set(ids).size).toBe(2);
    expect(screen.getAllByRole('region', { name: 'いまどうしてる？' })).toHaveLength(2);
  });
});
