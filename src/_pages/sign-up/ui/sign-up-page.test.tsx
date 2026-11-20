// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SignUpPage } from './sign-up-page';

vi.mock('@/features/account-access/index.server', () => ({ signUpAction: async () => undefined }));

describe('SignUpPage', () => {
  it('骨格を出さず、中央のカードに見出しと登録のフォームを出す', () => {
    render(<SignUpPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'x-modoki に登録' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登録する' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      'X Corp. とは関係の無い学習用のアプリ',
    );
  });
});
