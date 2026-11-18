// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

describe('Button（ui-ux.md の 4 節: 15px / 700、角は丸）', () => {
  it('既定は type="button" で、丸く太い', () => {
    render(<Button>フォローする</Button>);
    const button = screen.getByRole('button', { name: 'フォローする' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('rounded-full', 'font-bold', 'text-[15px]');
  });

  it.each([
    ['brand', 'bg-brand'],
    ['solid', 'bg-text'],
    ['outline', 'border-line'],
  ] as const)('種類 %s', (variant, className) => {
    render(<Button variant={variant}>押す</Button>);
    expect(screen.getByRole('button')).toHaveClass(className);
  });

  it('押すと onClick を呼び、使えないときは呼ばない', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>押す</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Button onClick={onClick} disabled>
        押す
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('送信のボタンにもでき、クラスを足せる', () => {
    render(
      <Button type="submit" className="w-full">
        送る
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });
});
