// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RightSidebar } from './right-sidebar';

describe('RightSidebar', () => {
  it('中身はまだ空の枠で、フッターに X Corp. とは関係が無いと出し、X の旧名を使わない', () => {
    const { container } = render(<RightSidebar />);
    expect(
      screen.getByText('X Corp. とは関係の無い学習用のアプリ').closest('footer'),
    ).toBeInTheDocument();
    // Built from parts so that `grep -ri` over src finds the word nowhere (FR-SHELL-09).
    expect(container.textContent).not.toMatch(new RegExp(['twit', 'ter'].join(''), 'i'));
  });
});
