// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Profile } from '@/entities/user';
import { ProfileHeader } from './profile-header';
import { ProfileTabs } from './profile-tabs';

const profile: Profile = {
  username: 'hanako',
  name: '花子',
  avatarUrl: null,
  bannerUrl: null,
  bio: '猫が好き',
  location: '東京',
  website: 'https://example.com',
  joinedAt: '2025-04-01T00:00:00.000Z',
  followersCount: 1234,
  followingCount: 5,
  postsCount: 9,
  isSelf: false,
};

describe('ProfileHeader（#23、ui-ux.md の 8 節）', () => {
  it('3:1 のバナー、重なるアバター、名前・@・自己紹介・場所・リンク・登録した月・数', () => {
    render(<ProfileHeader profile={profile} />);
    const region = screen.getByRole('region', { name: 'プロフィール' });
    expect(region.querySelector('[data-banner]')).toHaveClass('aspect-[3/1]');
    expect(within(region).getByRole('heading', { level: 2, name: '花子' })).toBeInTheDocument();
    expect(region).toHaveTextContent('@hanako');
    expect(region).toHaveTextContent('猫が好き');
    expect(region).toHaveTextContent('東京');
    expect(within(region).getByRole('link', { name: 'example.com' })).toHaveAttribute(
      'href',
      'https://example.com',
    );
    expect(within(region).getByRole('link', { name: 'example.com' })).toHaveAttribute(
      'rel',
      'noopener noreferrer nofollow',
    );
    expect(region).toHaveTextContent('2025年4月から利用しています');
    expect(region).toHaveTextContent('5 フォロー中');
    expect(region).toHaveTextContent('1,234 フォロワー');
    expect(within(region).queryByRole('link', { name: 'プロフィールを編集' })).toBeNull();
  });

  it('バナーの画像があれば、3:1 の枠いっぱいに出す', () => {
    render(<ProfileHeader profile={{ ...profile, bannerUrl: 'https://media.test/b.webp' }} />);
    const banner = screen
      .getByRole('region', { name: 'プロフィール' })
      .querySelector('[data-banner] img');
    expect(banner).toHaveAttribute('src', 'https://media.test/b.webp');
    expect(banner).toHaveClass('object-cover');
  });

  it('自分なら「プロフィールを編集」。空の項目は出さない', () => {
    render(
      <ProfileHeader profile={{ ...profile, isSelf: true, location: '', website: '', bio: '' }} />,
    );
    expect(screen.getByRole('link', { name: 'プロフィールを編集' })).toHaveAttribute(
      'href',
      '/settings/profile',
    );
    expect(screen.queryByText('東京')).toBeNull();
    expect(screen.queryByRole('link', { name: 'example.com' })).toBeNull();
  });
});

describe('ProfileTabs（#23）', () => {
  it('ポスト / 返信 / メディア、本人だけ いいね。選んだタブに下線', () => {
    const { rerender } = render(
      <ProfileTabs username="hanako" tab="with_replies" isSelf={false} />,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => [tab.textContent, tab.getAttribute('href')])).toEqual([
      ['ポスト', '/hanako'],
      ['返信', '/hanako/with_replies'],
      ['メディア', '/hanako/media'],
    ]);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1].querySelector('[data-indicator]')).not.toBeNull();
    rerender(<ProfileTabs username="hanako" tab="likes" isSelf />);
    expect(screen.getByRole('tab', { name: 'いいね' })).toHaveAttribute('href', '/hanako/likes');
  });
});
