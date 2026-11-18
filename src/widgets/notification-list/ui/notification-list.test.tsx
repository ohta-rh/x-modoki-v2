// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NotificationItem, NotificationPage } from '@/entities/notification';
import { NotificationList } from './notification-list';

afterEach(() => vi.unstubAllGlobals());

const person = (n: number, name: string) => ({ username: `u${n}`, name, avatarUrl: null });
const item = (
  id: string,
  type: NotificationItem['type'],
  actor: NotificationItem['actor'],
  post: NotificationItem['post'],
  read = false,
): NotificationItem => ({ id, type, createdAt: '2026-11-18T03:00:00.000Z', read, actor, post });
const mine = { id: '100', text: '私の投稿', authorUsername: 'me' };

const show = (
  firstPage: NotificationPage,
  markRead = vi.fn(async () => ({ ok: true as const, unread: 2 })),
) => {
  // No retries: a failed page shows its alert at once.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['notifications', 'unread-count'], 5);
  render(
    <QueryClientProvider client={client}>
      <NotificationList tab="all" firstPage={firstPage} markRead={markRead} />
    </QueryClientProvider>,
  );
  return { client, markRead };
};

describe('NotificationList（#26）', () => {
  // FR-NOTIF-03: 種類ごとのアイコン
  it.each([
    ['like', 'lucide-heart', 'text-like'],
    ['repost', 'lucide-repeat-2', 'text-repost'],
    ['follow', 'lucide-user', 'text-brand'],
    ['reply', 'lucide-message-circle', 'text-brand'],
    ['quote', 'lucide-quote', 'text-brand'],
    ['mention', 'lucide-at-sign', 'text-brand'],
  ] as const)('%s の行は %s のアイコンを %s で出す（#30）', (type, icon, color) => {
    show({
      items: [item('1', type, person(1, '花子'), type === 'follow' ? null : mine)],
      nextCursor: null,
    });
    const svg = screen.getByRole('article').querySelector('svg[data-icon]');
    expect(svg).toHaveClass(icon, color);
  });

  it('同じ種類と投稿をまとめ、種類のアイコン・アバター・文言・投稿を出す', () => {
    show({
      items: [
        item('9', 'like', person(1, '花子'), mine),
        item('8', 'follow', person(3, '三郎'), null, true),
        item('7', 'like', person(2, '次郎'), mine),
        item('6', 'reply', person(1, '花子'), {
          id: '200',
          text: '返信です',
          authorUsername: 'u1',
        }),
      ],
      nextCursor: null,
    });
    const rows = screen.getAllByRole('article');
    expect(rows).toHaveLength(3);
    const like = within(rows[0]);
    expect(rows[0]).toHaveTextContent('花子さんと他1人があなたのポストをいいねしました');
    expect(rows[0]).toHaveTextContent('私の投稿');
    expect(rows[0].querySelector('[data-icon]')).toHaveAttribute('data-icon', 'like');
    expect(like.getAllByRole('img').map((img) => img.getAttribute('aria-label'))).toEqual([
      '花子',
      '次郎',
    ]);
    expect(like.getByRole('link', { name: /私の投稿/ })).toHaveAttribute('href', '/me/status/100');
    expect(rows[0]).toHaveAttribute('data-unread', 'true');
    // Unread rows are tinted with the brand blue (`accent` is the grey hover colour).
    expect(rows[0]).toHaveClass('bg-brand/5');
    expect(rows[1].querySelector('[data-icon]')).toHaveClass('text-brand');
    expect(rows[1]).toHaveTextContent('三郎さんにフォローされました');
    expect(rows[1].querySelector('[data-icon]')).toHaveAttribute('data-icon', 'follow');
    expect(rows[1]).toHaveAttribute('data-unread', 'false');
    expect(within(rows[1]).getByRole('link', { name: '三郎' })).toHaveAttribute('href', '/u3');
    expect(rows[2]).toHaveTextContent('花子さんが返信しました');
    expect(within(rows[2]).getByRole('link', { name: /返信です/ })).toHaveAttribute(
      'href',
      '/u1/status/200',
    );
  });

  it('開くと出ている通知を、そのタブの分だけ既読にし、バッジを残りの未読の数にする', async () => {
    const { client, markRead } = show({
      items: [
        item('9', 'like', person(1, '花子'), mine),
        item('7', 'like', person(2, '次郎'), mine),
      ],
      nextCursor: null,
    });
    await waitFor(() => expect(markRead).toHaveBeenCalledWith('9', 'all'));
    // The badge shows what is still unread (another tab's, or newer), not a blind 0 (review 1).
    await waitFor(() => expect(client.getQueryData(['notifications', 'unread-count'])).toBe(2));
  });

  it('既読にできなければ（ログインが切れたなど）、バッジは変えない', async () => {
    const markRead = vi.fn(async () => ({ ok: false as const, error: 'UNAUTHORIZED' as const }));
    const { client } = show(
      { items: [item('9', 'like', person(1, '花子'), mine)], nextCursor: null },
      markRead as never,
    );
    await waitFor(() => expect(markRead).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.getQueryData(['notifications', 'unread-count'])).toBe(5);
  });

  it('通知が無ければ文言を出し、既読にはしない', () => {
    const { markRead } = show({ items: [], nextCursor: null });
    expect(screen.getByText('まだ通知はありません')).toBeInTheDocument();
    expect(markRead).not.toHaveBeenCalled();
  });

  it('続きはタブとカーソルを付けて、3 ページ目以降も読む。読めなければ知らせる', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ items: [item('3', 'follow', person(4, '四郎'), null)], nextCursor: '3' }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    show({ items: [item('9', 'follow', person(1, '花子'), null)], nextCursor: '9' });
    expect(await screen.findByText('花子さんと他1人にフォローされました')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/notifications?tab=all&cursor=9');
    expect(await screen.findByRole('alert')).toHaveTextContent('続きを読み込めませんでした');
  });
});
