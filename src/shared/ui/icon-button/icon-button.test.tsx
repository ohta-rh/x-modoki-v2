// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { X } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { IconButton } from './icon-button';

describe('IconButton（ui-ux.md の 10 節: アイコンだけのボタンに名前）', () => {
  it('aria-label を読み上げる名前にし、アイコンは読み上げない', () => {
    render(<IconButton label="閉じる" icon={X} />);
    const button = screen.getByRole('button', { name: '閉じる' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('rounded-full');
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
