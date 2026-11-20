// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NotFoundPage } from './not-found-page';

describe('NotFoundPage（#20: 無い投稿の 404 の画面）', () => {
  it('存在しないと書き、検索へのリンクを出す', () => {
    render(<NotFoundPage />);
    expect(screen.getByRole('heading', { name: 'このページは存在しません。' })).toBeInTheDocument();
    expect(screen.getByText('他のページを検索してみましょう。')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '検索' })).toHaveAttribute('href', '/explore');
  });
});
