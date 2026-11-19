// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RepostMenu } from './repost-menu';

describe('RepostMenu（#22）', () => {
  it('押すとメニュー（リポスト / 引用）。リポストで onToggle、引用で onQuote', async () => {
    const onToggle = vi.fn();
    const onQuote = vi.fn();
    render(<RepostMenu reposted={false} count={0} onToggle={onToggle} onQuote={onQuote} />);
    const button = screen.getByRole('button', { name: 'リポスト' });
    expect(button).not.toHaveClass('text-repost');
    await userEvent.click(button);
    await userEvent.click(await screen.findByRole('menuitem', { name: 'リポスト' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    // The first press swapped in the real menu button (#32): press the one on screen now.
    await userEvent.click(screen.getByRole('button', { name: 'リポスト' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: '引用' }));
    expect(onQuote).toHaveBeenCalledTimes(1);
  });

  it('リポスト済みなら --repost の色で数を出し、メニューは「リポストを取り消す」', async () => {
    render(<RepostMenu reposted count={3} onToggle={() => undefined} onQuote={() => undefined} />);
    // The name holds the number shown (WCAG 2.5.3, #31).
    const button = screen.getByRole('button', { name: 'リポスト 3' });
    expect(button).toHaveClass('text-repost');
    expect(button).toHaveTextContent('3');
    await userEvent.click(button);
    expect(await screen.findByRole('menuitem', { name: 'リポストを取り消す' })).toBeInTheDocument();
  });
});
