// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BookmarkButton } from './bookmark-button';

describe('BookmarkButton（#21）', () => {
  it('押していなければ灰色、押してあれば青で塗る。押すと onToggle', async () => {
    const onToggle = vi.fn();
    const { rerender } = render(<BookmarkButton bookmarked={false} onToggle={onToggle} />);
    const button = screen.getByRole('button', { name: 'ブックマーク' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).not.toHaveClass('text-brand');
    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<BookmarkButton bookmarked onToggle={onToggle} />);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveClass('text-brand');
    expect(button.querySelector('svg')).toHaveClass('fill-current');
  });
});
