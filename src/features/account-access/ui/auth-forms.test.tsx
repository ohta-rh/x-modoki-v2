// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SignInForm } from './sign-in-form';
import { SignUpForm } from './sign-up-form';

type UpAction = Parameters<typeof SignUpForm>[0]['action'];
type InAction = Parameters<typeof SignInForm>[0]['action'];

describe('SignUpForm', () => {
  it('4 つの欄を出し、送ると action に値を渡す', async () => {
    const action = vi.fn<UpAction>(async () => undefined);
    render(<SignUpForm action={action} />);
    await userEvent.type(screen.getByLabelText('名前'), 'サンプル');
    await userEvent.type(screen.getByLabelText('ユーザー名'), 'sample_01');
    await userEvent.type(screen.getByLabelText('メールアドレス'), 'a@example.test');
    await userEvent.type(screen.getByLabelText('パスワード'), 'correct-horse');
    expect(screen.getByLabelText('パスワード')).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: '登録する' }));
    const data = action.mock.calls[0][1] as FormData;
    expect(Object.fromEntries(data)).toEqual({
      name: 'サンプル',
      username: 'sample_01',
      email: 'a@example.test',
      password: 'correct-horse',
    });
  });

  it('欄ごとの誤りをその欄の説明として出し、入れた値を戻す', async () => {
    const action = vi.fn<UpAction>(async () => ({
      fieldErrors: { username: ['このユーザー名は使えません'] },
      values: { name: 'サンプル', username: 'settings', email: 'a@example.test' },
    }));
    render(<SignUpForm action={action} />);
    await userEvent.click(screen.getByRole('button', { name: '登録する' }));
    const username = screen.getByLabelText('ユーザー名');
    expect(username).toHaveAccessibleDescription('このユーザー名は使えません');
    expect(username).toHaveAttribute('aria-invalid', 'true');
    expect(username).toHaveValue('settings');
    expect(screen.getByLabelText('名前')).toHaveAttribute('aria-invalid', 'false');
  });

  it('全体の誤りを alert で出し、ログインへのリンクがある', async () => {
    const action = vi.fn<UpAction>(async () => ({
      formError: '試行が多すぎます',
      values: { name: '', username: '', email: '' },
    }));
    render(<SignUpForm action={action} />);
    await userEvent.click(screen.getByRole('button', { name: '登録する' }));
    expect(screen.getByRole('alert')).toHaveTextContent('試行が多すぎます');
    expect(screen.getByRole('link', { name: 'ログイン' })).toHaveAttribute('href', '/i/flow/login');
  });
});

describe('SignInForm', () => {
  it('戻り先を隠しの欄で送り、誤りを alert で出して入れた値を戻す', async () => {
    const action = vi.fn<InAction>(async () => ({
      formError: '違います',
      values: { identifier: 'sample_01' },
    }));
    render(<SignInForm action={action} next="/notifications" />);
    await userEvent.type(screen.getByLabelText('ユーザー名またはメールアドレス'), 'sample_01');
    await userEvent.type(screen.getByLabelText('パスワード'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    expect(Object.fromEntries(action.mock.calls[0][1] as FormData)).toEqual({
      identifier: 'sample_01',
      password: 'nope',
      next: '/notifications',
    });
    expect(screen.getByRole('alert')).toHaveTextContent('違います');
    expect(screen.getByLabelText('ユーザー名またはメールアドレス')).toHaveValue('sample_01');
    expect(screen.getByRole('link', { name: 'アカウントを作成' })).toHaveAttribute(
      'href',
      '/i/flow/signup',
    );
  });

  it('戻り先が無ければ空で送る', async () => {
    const action = vi.fn<InAction>(async () => undefined);
    render(<SignInForm action={action} />);
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    expect((action.mock.calls[0][1] as FormData).get('next')).toBe('');
  });
});

// NFR-A11Y-02: 文の中のリンクは、色だけで見分けさせない（WCAG 1.4.1）
describe('文の中のリンク（#31）', () => {
  it('ログインと登録の画面の、もう一方へのリンクには下線がある', () => {
    const { unmount } = render(<SignUpForm action={vi.fn(async () => undefined)} />);
    expect(screen.getByRole('link', { name: 'ログイン' })).toHaveClass('underline');
    unmount();
    render(<SignInForm action={vi.fn(async () => undefined)} next="/home" />);
    expect(screen.getByRole('link', { name: 'アカウントを作成' })).toHaveClass('underline');
  });
});

describe('通信が切れて送れなかったとき（#82）', () => {
  const offline = async () => {
    throw new TypeError('Failed to fetch');
  };

  it('登録: 通信の文言を出し、入れた値（パスワード以外）を残す', async () => {
    render(<SignUpForm action={vi.fn<UpAction>(offline)} />);
    await userEvent.type(screen.getByLabelText('名前'), 'サンプル');
    await userEvent.type(screen.getByLabelText('ユーザー名'), 'sample_01');
    await userEvent.type(screen.getByLabelText('メールアドレス'), 'a@example.test');
    await userEvent.type(screen.getByLabelText('パスワード'), 'correct-horse');
    await userEvent.click(screen.getByRole('button', { name: '登録する' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '通信できませんでした。もう一度お試しください',
    );
    expect(screen.getByLabelText('ユーザー名')).toHaveValue('sample_01');
    expect(screen.getByLabelText('メールアドレス')).toHaveValue('a@example.test');
  });

  it('ログイン: 通信の文言を出し、ユーザー名を残す', async () => {
    render(<SignInForm action={vi.fn<InAction>(offline)} />);
    await userEvent.type(screen.getByLabelText('ユーザー名またはメールアドレス'), 'sample_01');
    await userEvent.type(screen.getByLabelText('パスワード'), 'correct-horse');
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '通信できませんでした。もう一度お試しください',
    );
    expect(screen.getByLabelText('ユーザー名またはメールアドレス')).toHaveValue('sample_01');
  });
});
