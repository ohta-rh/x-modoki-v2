// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserHoverCard } from './user-hover-card';

describe('UserHoverCard（#23）', () => {
  it('約 0.5 秒ホバーすると、その人のプロフィールを読んで小さなカードを出す', async () => {
    const fetchSpy = vi.fn(async () =>
      Response.json({
        username: 'hanako',
        name: '花子',
        avatarUrl: null,
        bannerUrl: null,
        bio: '猫が好き',
        location: '',
        website: '',
        joinedAt: '2025-04-01T00:00:00.000Z',
        followersCount: 3,
        followingCount: 2,
        postsCount: 1,
        isSelf: false,
        isFollowing: false,
      }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    render(
      <UserHoverCard username="hanako" name="花子" label="花子 のプロフィール">
        アバター
      </UserHoverCard>,
    );
    const trigger = screen.getByRole('link', { name: '花子 のプロフィール' });
    expect(trigger).toHaveAttribute('href', '/hanako');
    await userEvent.hover(trigger);
    const card = await screen.findByRole(
      'dialog',
      { name: '花子 のプロフィールのカード' },
      { timeout: 2000 },
    );
    expect(fetchSpy).toHaveBeenCalledWith('/api/users/hanako');
    expect(await screen.findByText('猫が好き')).toBeInTheDocument();
    expect(card).toHaveTextContent('@hanako');
    expect(card).toHaveTextContent('2 フォロー中');
    expect(card).toHaveTextContent('3 フォロワー');
  });

  it('プロフィールが読めなくても、名前だけのカードを出し、エラーにしない', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 404 })),
    );
    const errors = vi.spyOn(console, 'error');
    render(
      <UserHoverCard username="ghost" name="消えた人" label="消えた人 のプロフィール">
        アバター
      </UserHoverCard>,
    );
    await userEvent.hover(screen.getByRole('link', { name: '消えた人 のプロフィール' }));
    const card = await screen.findByRole(
      'dialog',
      { name: '消えた人 のプロフィールのカード' },
      { timeout: 2000 },
    );
    await new Promise((done) => setTimeout(done, 50));
    expect(card).toHaveTextContent('@ghost');
    expect(card).not.toHaveTextContent('フォロワー');
    expect(errors).not.toHaveBeenCalled();
  });
});
