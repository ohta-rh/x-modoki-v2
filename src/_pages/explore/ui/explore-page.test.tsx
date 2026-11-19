// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExplorePage } from './explore-page';

vi.mock('next/form', () => ({
  // Every attribute through, role and aria-label included (#31).
  default: ({ children, ...props }: React.ComponentProps<'form'>) => (
    <form {...props}>{children}</form>
  ),
}));

describe('ExplorePage（#27）', () => {
  it('検索の欄と、その下にトレンド', () => {
    render(<ExplorePage trends={[{ tag: '海', count: 4 }]} />);
    expect(screen.getByRole('searchbox', { name: '検索' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'トレンド' })).toHaveTextContent('#海');
  });

  // NFR-A11Y-08: 見出しの順とランドマーク
  it('画面の名前の h1 と、名前の付いた検索のランドマークがある（#31）', () => {
    render(<ExplorePage trends={[]} />);
    expect(screen.getByRole('heading', { level: 1, name: '話題を検索' })).toBeInTheDocument();
    expect(screen.getByRole('search', { name: '話題を検索' })).toBeInTheDocument();
    // Below 640px the box keeps clear of the account avatar (#85 review).
    expect(screen.getByRole('search', { name: '話題を検索' }).parentElement).toHaveClass(
      'pl-10',
      'sm:pl-0',
    );
    // The right sidebar has its own いまどうしてる？: this one is named apart from it.
    expect(screen.getByRole('region', { name: 'トレンド' })).toBeInTheDocument();
  });
});
