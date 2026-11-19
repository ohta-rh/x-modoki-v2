// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './page-header';

describe('PageHeader（#74）', () => {
  it('見出しは 1 行に収め、長い名前は切り詰める（列を広げない）', () => {
    render(<PageHeader title={'N'.repeat(50)} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('min-w-0', 'truncate');
  });
});
