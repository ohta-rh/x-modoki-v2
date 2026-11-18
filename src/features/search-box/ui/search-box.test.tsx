// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchBox } from './search-box';

vi.mock('next/form', () => ({
  default: ({ action, children, ...props }: { action: string; children: React.ReactNode }) => (
    <form action={action} {...props}>
      {children}
    </form>
  ),
}));

describe('SearchBox（#27）', () => {
  it('/search へ q を送る検索の欄。空や空白だけでは送らず、100 文字まで', () => {
    render(<SearchBox defaultValue="猫" />);
    const box = screen.getByRole('searchbox', { name: '検索' });
    expect(box.closest('form')).toHaveAttribute('action', '/search');
    expect(box).toHaveAttribute('name', 'q');
    expect(box).toHaveValue('猫');
    expect(box).toBeRequired();
    expect(box).toHaveAttribute('pattern', '.*\\S.*');
    expect(box).toHaveAttribute('maxLength', '100');
    expect(screen.getByRole('search')).toBeInTheDocument();
  });
});
