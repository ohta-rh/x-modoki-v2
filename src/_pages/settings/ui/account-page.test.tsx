// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccountPage } from './account-page';

describe('AccountPage（#29）', () => {
  it('「アカウント」の見出しの下に、ユーザー名・メールアドレス・登録した日', () => {
    render(
      <AccountPage
        username="hanako"
        email="hanako@example.test"
        createdAt="2026-11-18T15:30:00.000Z"
      />,
    );
    expect(screen.getByRole('heading', { name: 'アカウント' })).toBeTruthy();
    const info = screen.getByRole('region', { name: 'アカウントの情報' });
    expect(info).toHaveTextContent('@hanako');
    expect(info).toHaveTextContent('hanako@example.test');
    expect(info).toHaveTextContent('2026年11月19日');
  });
});
