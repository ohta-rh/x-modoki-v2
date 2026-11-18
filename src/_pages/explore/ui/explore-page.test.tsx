// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExplorePage } from './explore-page';

vi.mock('next/form', () => ({
  default: ({ action, children }: { action: string; children: React.ReactNode }) => (
    <form action={action}>{children}</form>
  ),
}));

describe('ExplorePage（#27）', () => {
  it('検索の欄と、その下にトレンド', () => {
    render(<ExplorePage trends={[{ tag: '海', count: 4 }]} />);
    expect(screen.getByRole('searchbox', { name: '検索' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'いまどうしてる？' })).toHaveTextContent('#海');
  });
});
