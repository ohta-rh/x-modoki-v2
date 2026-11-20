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

  it('渡された中身（検索の欄・トレンド・おすすめ、#27）を、フッターの上に並べる', () => {
    render(
      <RightSidebar>
        <p>中身</p>
      </RightSidebar>,
    );
    const content = screen.getByText('中身');
    const footer = screen.getByText('X Corp. とは関係の無い学習用のアプリ').closest('footer')!;
    expect(content.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
