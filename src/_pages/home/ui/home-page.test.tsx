// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from './home-page';

describe('HomePage', () => {
  it('ヘッダーに「ホーム」を出す（タイムラインは #19）', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'ホーム' })).toBeInTheDocument();
  });
});
