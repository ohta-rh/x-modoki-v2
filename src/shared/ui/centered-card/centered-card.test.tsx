// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CenteredCard } from './centered-card';

describe('CenteredCard', () => {
  it('ロゴ・見出し・中身・フッターを中央に並べる', () => {
    render(
      <CenteredCard title="見出し">
        <p>中身</p>
      </CenteredCard>,
    );
    expect(screen.getByRole('heading', { level: 1, name: '見出し' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('中身');
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      'X Corp. とは関係の無い学習用のアプリ',
    );
  });
});
