// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SettingsHome } from './settings-home';

describe('SettingsHome（#29）', () => {
  it('/settings の右の欄は、項目を選ぶよう案内する', () => {
    render(<SettingsHome />);
    expect(screen.getByText('左の一覧から、設定する項目を選んでください')).toBeInTheDocument();
  });
});
