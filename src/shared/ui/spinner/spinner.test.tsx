// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from './spinner';

describe('Spinner', () => {
  it('読み込み中だと読み上げ、アクセントの色で回る', () => {
    render(<Spinner />);
    const status = screen.getByRole('status', { name: '読み込み中' });
    expect(status.querySelector('svg')).toHaveClass('animate-spin', 'text-brand');
  });
});
