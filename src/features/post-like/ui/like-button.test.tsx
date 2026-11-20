// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LikeButton } from './like-button';

describe('LikeButton（#21、ui-ux.md の 5 節）', () => {
  it('押していなければ灰色で、数が 0 なら数を出さない。押すと onToggle', async () => {
    const onToggle = vi.fn();
    render(<LikeButton liked={false} count={0} onToggle={onToggle} />);
    const button = screen.getByRole('button', { name: 'いいね' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).not.toHaveClass('text-like');
    expect(button).toHaveTextContent(/^$/);
    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('押してあれば --like の色・塗ったハート・弾む動き（動きを減らす設定では止まる）。数は短く', () => {
    render(<LikeButton liked count={12_345} onToggle={() => undefined} />);
    // NFR-A11Y-06: the name holds the number shown (WCAG 2.5.3, #31).
    const button = screen.getByRole('button', { name: 'いいね 1.2万' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveClass('text-like');
    expect(button).toHaveTextContent('1.2万');
    const icon = button.querySelector('svg')!;
    expect(icon).toHaveClass('fill-current', 'motion-safe:animate-like-pop');
  });
});
