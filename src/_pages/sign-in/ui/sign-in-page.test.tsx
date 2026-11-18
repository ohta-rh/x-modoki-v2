// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SignInPage } from './sign-in-page';

vi.mock('@/features/account-access/index.server', () => ({ signInAction: async () => undefined }));

describe('SignInPage', () => {
  it('中央のカードに見出しとログインのフォームを出し、戻り先をフォームに渡す', () => {
    const { container } = render(<SignInPage next="/notifications" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'x-modoki にログイン' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
    expect(container.querySelector('input[name="next"]')).toHaveValue('/notifications');
  });
});
