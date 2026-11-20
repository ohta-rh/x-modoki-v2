// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { toast } from '@/shared/ui/toast';
import { WhoToFollow } from './who-to-follow';

const person = (username: string, name: string) => ({
  username,
  name,
  avatarUrl: null,
  bio: '',
  isFollowing: false,
  isSelf: false,
});

describe('WhoToFollow（#27）', () => {
  it('見出しと、プロフィールへのリンクとフォローのボタン。押すとすぐ「フォロー中」、失敗したら戻す', async () => {
    const action = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, message: 'だめでした' });
    render(
      <WhoToFollow users={[person('hana', '花子'), person('taro', '太郎')]} action={action} />,
    );
    const section = within(screen.getByRole('region', { name: 'おすすめユーザー' }));
    expect(section.getByRole('link', { name: /花子/ })).toHaveAttribute('href', '/hana');
    const buttons = section.getAllByRole('button', { name: 'フォロー' });
    await userEvent.click(buttons[0]);
    expect(action).toHaveBeenCalledWith('hana', true);
    expect(section.getAllByRole('button', { name: 'フォロー中' })).toHaveLength(1);
    await userEvent.click(section.getAllByRole('button', { name: 'フォロー' })[0]);
    expect(action).toHaveBeenLastCalledWith('taro', true);
    expect(await section.findAllByRole('button', { name: 'フォロー' })).toHaveLength(1);
  });

  it('ログインしていなければ、ボタンはログインへのリンク。誰もいなければ出さない', () => {
    const { container, unmount } = render(
      <WhoToFollow users={[person('hana', '花子')]} loginHref="/i/flow/login" />,
    );
    expect(screen.getByRole('link', { name: 'フォロー' })).toHaveAttribute('href', '/i/flow/login');
    unmount();
    const empty = render(<WhoToFollow users={[]} />);
    expect(empty.container).toBeEmptyDOMElement();
    void container;
  });

  it('通信が切れてフォローが失敗したら、元に戻してトーストで知らせる。断られたときも知らせる（#70）', async () => {
    const add = vi.spyOn(toast, 'add');
    const action = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ ok: false, message: 'フォローが多すぎます' });
    render(<WhoToFollow users={[person('hana', '花子')]} action={action} />);
    const section = within(screen.getByRole('region', { name: 'おすすめユーザー' }));
    await userEvent.click(section.getByRole('button', { name: 'フォロー' }));
    await vi.waitFor(() =>
      expect(add).toHaveBeenCalledWith({ title: '通信できませんでした。もう一度お試しください' }),
    );
    expect(section.getByRole('button', { name: 'フォロー' })).toBeInTheDocument();
    await userEvent.click(section.getByRole('button', { name: 'フォロー' }));
    await vi.waitFor(() => expect(add).toHaveBeenCalledWith({ title: 'フォローが多すぎます' }));
  });
});
