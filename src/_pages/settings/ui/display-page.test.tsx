// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DisplayPage } from './display-page';

vi.mock('@/features/display-settings/index.server', () => ({
  setDisplayAction: async () => ({ ok: true }),
}));

describe('DisplayPage（#29）', () => {
  it('「表示」の見出しの下に、今の値を選んだ色と背景を出す', () => {
    render(<DisplayPage theme="dim" accent="purple" />);
    expect(screen.getByRole('heading', { name: '表示' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'ダークブルー' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '紫' })).toBeChecked();
  });
});
