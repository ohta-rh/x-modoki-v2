// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './field';

describe('Field', () => {
  it('ラベルで名前が付き、エラーは説明になり、無効の印が付く', () => {
    render(<Field label="名前" name="name" errors={['名前を入れてください']} />);
    const input = screen.getByRole('textbox', { name: '名前' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('名前を入れてください');
  });

  it('multiline なら複数行の入力欄（#23 の自己紹介）', () => {
    render(<Field label="自己紹介" name="bio" multiline defaultValue="猫" />);
    const input = screen.getByRole('textbox', { name: '自己紹介' });
    expect(input.tagName).toBe('TEXTAREA');
    expect(input).toHaveValue('猫');
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
  });
});
