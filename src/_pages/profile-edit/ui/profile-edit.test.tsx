// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProfileEditModal, ProfileEditPage } from './profile-edit';

const router = { push: vi.fn(), back: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const updateProfileAction = vi.fn(async () => ({ ok: true }));
vi.mock('@/features/profile-edit/index.server', () => ({
  updateProfileAction: (...args: unknown[]) => updateProfileAction(...(args as [])),
}));

// A stand-in for the picker: choosing hands over an upload ID, as the real one does once sent.
vi.mock('@/features/media-upload', () => ({
  ProfileImagePicker: ({
    kind,
    onChange,
  }: {
    kind: string;
    onChange: (state: { id: string | null; busy: boolean }) => void;
  }) => (
    <button type="button" onClick={() => onChange({ id: `${kind}-id`, busy: false })}>
      {kind} を選ぶ
    </button>
  ),
}));

const data = {
  username: 'hanako',
  initial: { name: '花子', bio: '', location: '', website: '' },
  images: { avatarUrl: null, bannerUrl: null },
};

describe('プロフィールの編集の画面（#23）', () => {
  it('モーダル: 「プロフィールを編集」のダイアログ。保存すると前の画面へ戻り、読み直す。閉じると戻る', async () => {
    render(<ProfileEditModal {...data} />);
    const dialog = within(screen.getByRole('dialog', { name: 'プロフィールを編集' }));
    await userEvent.click(dialog.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(router.back).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Escape}');
    expect(router.back).toHaveBeenCalledTimes(2);
  });

  it('ページ: 見出しとフォーム。保存するとプロフィールへ移り、読み直す', async () => {
    router.refresh.mockClear();
    render(<ProfileEditPage {...data} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'プロフィールを編集' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/hanako'));
    // The shell (the account menu's name and avatar) is a layout: it is read again too (#25).
    expect(router.refresh).toHaveBeenCalled();
  });
});

describe('保存の途中で、ほかへ移ったとき（#77）', () => {
  const slowSave = () => {
    let finish!: () => void;
    updateProfileAction.mockImplementationOnce(
      () => new Promise((done) => (finish = () => done({ ok: true }))),
    );
    return () => finish();
  };

  // The modal keeps the screen behind it out of reach: there, only Back can move away.
  it('ページ: 保存の間にリンクを押したら、保存のあとに移らず、読み直すだけ', async () => {
    router.push.mockClear();
    router.refresh.mockClear();
    const finish = slowSave();
    render(
      <>
        <a href="https://example.test/elsewhere" onClick={(event) => event.preventDefault()}>
          話題を検索
        </a>
        <ProfileEditPage {...data} />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    await userEvent.click(screen.getByRole('link', { name: '話題を検索' }));
    finish();
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(router.push).not.toHaveBeenCalled();
  });

  it.each([
    ['ページ', ProfileEditPage],
    ['モーダル', ProfileEditModal],
  ])('%s: 保存の間に「戻る」を押したときも、保存のあとに移らない', async (_kind, Screen) => {
    router.push.mockClear();
    router.back.mockClear();
    router.refresh.mockClear();
    const finish = slowSave();
    render(<Screen {...data} />);
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    window.dispatchEvent(new PopStateEvent('popstate'));
    finish();
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(router.push).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('プロフィールの編集の画像（#25）', () => {
  it('アバターとバナーを選ぶ欄があり、選んだ画像の ID を一緒に保存する', async () => {
    render(<ProfileEditPage {...data} />);
    await userEvent.click(screen.getByRole('button', { name: 'avatar を選ぶ' }));
    await userEvent.click(screen.getByRole('button', { name: 'banner を選ぶ' }));
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(updateProfileAction).toHaveBeenLastCalledWith({
      ...data.initial,
      avatarId: 'avatar-id',
      bannerId: 'banner-id',
    });
  });

  it('モーダルは画面の高さを超えず、中をスクロールできる（画像の欄で縦に伸びても保存を押せる）', () => {
    render(<ProfileEditModal {...data} />);
    expect(screen.getByRole('dialog', { name: 'プロフィールを編集' })).toHaveClass(
      'max-h-[90dvh]',
      'overflow-y-auto',
    );
  });
});
