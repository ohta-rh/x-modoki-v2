// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './avatar';

describe('Avatar（ui-ux.md の 4 節: 円、タイムラインは 40px）', () => {
  it('画像があれば、名前を代替テキストにした円い画像を出す', () => {
    render(<Avatar src="http://media.test/a.webp" name="サンプル 01" />);
    const image = screen.getByRole('img', { name: 'サンプル 01' });
    expect(image).toHaveAttribute('src', 'http://media.test/a.webp');
    expect(image).toHaveClass('rounded-full');
    expect(image).toHaveAttribute('width', '40');
  });

  it('画像が無ければ、名前の最初の 1 文字を円の中に出す', () => {
    render(<Avatar name="サンプル 01" size={48} />);
    const fallback = screen.getByRole('img', { name: 'サンプル 01' });
    expect(fallback).toHaveTextContent('サ');
    expect(fallback).toHaveStyle({ width: '48px', height: '48px' });
  });
});
