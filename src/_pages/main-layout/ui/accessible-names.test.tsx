// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Post } from '@/entities/post';
import { ComposerDialog } from '@/widgets/composer-modal';
import { HomeTimeline } from '@/widgets/timeline-feed';
import { MainLayout } from './main-layout';

vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/features/account-access/index.server', () => ({ signOutAction: async () => undefined }));
vi.mock('@/features/user-follow/index.server', () => ({
  setFollowAction: async () => ({ ok: true }),
}));
vi.mock('next/form', () => ({
  // Every attribute through, role and aria-label included (#31).
  default: ({ children, ...props }: React.ComponentProps<'form'>) => (
    <form {...props}>{children}</form>
  ),
}));

const post: Post = {
  id: '1',
  author: { username: 'taro', name: '太郎', avatarUrl: null },
  text: '投稿',
  links: [],
  createdAt: '2026-11-19T00:00:00.000Z',
  media: [],
  counts: { replies: 1, reposts: 1, likes: 1, bookmarks: 0, views: 1 },
  viewer: { liked: false, reposted: false, bookmarked: false, isAuthor: true },
  repostedBy: null,
  replyTo: null,
  quoted: null,
};
const ok = async () => ({ ok: true as const });

describe('名前の無いボタンが 0 個（#29、ui-ux.md の 10 節）', () => {
  // NFR-A11Y-06: アイコンだけのボタンの全てに、読み上げられる名前（`aria-label`）がある。画像の全てに `alt` がある
  it('外枠・ナビ・投稿の欄・タイムラインの操作・投稿のモーダル', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MainLayout
          viewer={{
            name: '花子',
            username: 'hanako',
            image: null,
            unread: 2,
            theme: 'light',
            accent: 'blue',
          }}
          sidebar={{ trends: [{ tag: '猫', count: 1 }], suggestions: [] }}
          modal={
            <ComposerDialog
              username="hanako"
              action={async () => ({ ok: true, id: '2' })}
              onClose={vi.fn()}
            />
          }
        >
          <HomeTimeline
            kind="following"
            firstPage={{ items: [post], nextCursor: null, newestId: '1' }}
            now="2026-11-19T00:00:00.000Z"
            action={async () => ({ ok: true, id: '2' })}
            deleteAction={ok}
            likeAction={async () => ({ ok: true, active: true, count: 1 })}
            bookmarkAction={async () => ({ ok: true, active: true, count: 1 })}
            repostAction={async () => ({ ok: true, active: true, count: 1 })}
            quoteAction={async () => ({ ok: true, id: '3' })}
          />
        </MainLayout>
      </QueryClientProvider>,
    );
    const buttons = screen.getAllByRole('button', { hidden: true });
    expect(buttons.length).toBeGreaterThan(8);
    const unnamed = screen.queryAllByRole('button', {
      hidden: true,
      name: (name) => name.trim() === '',
    });
    expect(unnamed.map((button) => button.outerHTML.slice(0, 120))).toEqual([]);
  });
});
