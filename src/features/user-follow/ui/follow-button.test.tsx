// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FollowButton } from './follow-button';

describe('FollowButton（#24、ui-ux.md の 8 節）', () => {
  it('フォローしていなければ「フォロー」。押すと onToggle', async () => {
    const onToggle = vi.fn();
    render(<FollowButton following={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'フォロー' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('フォロー中はホバーで「フォロー解除」と --danger の色', async () => {
    render(<FollowButton following onToggle={() => undefined} />);
    const button = screen.getByRole('button', { name: 'フォロー中' });
    expect(button).not.toHaveClass('text-danger');
    await userEvent.hover(button);
    expect(button).toHaveAccessibleName('フォロー解除');
    expect(button).toHaveClass('text-danger');
    await userEvent.unhover(button);
    expect(button).toHaveAccessibleName('フォロー中');
    // Focus alone does not arm it: the criterion is hover (ui-ux.md 8).
    act(() => button.focus());
    expect(button).toHaveAccessibleName('フォロー中');
  });

  it('押して「フォロー中」になった直後は、ポインタが乗っていても「フォロー中」（#24 のレビュー）', async () => {
    function Harness() {
      const [following, setFollowing] = useState(false);
      return <FollowButton following={following} onToggle={() => setFollowing(!following)} />;
    }
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'フォロー' });
    await userEvent.click(button);
    expect(button).toHaveAccessibleName('フォロー中');
    expect(button).not.toHaveClass('text-danger');
    // WebKit can fire mouseenter again when the label changes under the pointer, and a click can
    // focus the button: neither may flip it to フォロー解除 before the pointer has left once (CI).
    fireEvent.mouseEnter(button);
    act(() => button.focus());
    expect(button).toHaveAccessibleName('フォロー中');
    await userEvent.unhover(button);
    await userEvent.hover(button);
    expect(button).toHaveAccessibleName('フォロー解除');
  });

  it('ログインしていなければ、ログインへのリンク（戻り先つき）', () => {
    render(<FollowButton following={false} loginHref="/i/flow/login?next=%2Fhana" />);
    expect(screen.getByRole('link', { name: 'フォロー' })).toHaveAttribute(
      'href',
      '/i/flow/login?next=%2Fhana',
    );
  });
});
