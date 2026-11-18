// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComingSoonPage } from './coming-soon-page';

describe('ComingSoonPage', () => {
  it('画面の名前を見出しにし、準備中だと書く', () => {
    render(<ComingSoonPage title="通知" />);
    expect(screen.getByRole('heading', { level: 1, name: '通知' })).toBeInTheDocument();
    expect(screen.getByText('この画面は準備中です')).toBeInTheDocument();
  });
});
