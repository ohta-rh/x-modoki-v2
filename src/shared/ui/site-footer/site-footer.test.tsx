// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteFooter } from './site-footer';

describe('SiteFooter', () => {
  it('FR-SHELL-09: X Corp. とは関係の無い学習用のアプリだと書き、クラスを足せる', () => {
    render(<SiteFooter className="lg:hidden" />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent('X Corp. とは関係の無い学習用のアプリ');
    expect(footer).toHaveClass('lg:hidden');
  });
});
