import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { Post, PostPage } from '@/entities/post';
import { updatePostInCaches } from './update-post-in-caches';

const post = (id: string, likes = 0): Post => ({
  id,
  author: { username: 'taro', name: '太郎', avatarUrl: null },
  text: id,
  createdAt: '2026-11-18T03:00:00.000Z',
  media: [],
  counts: { replies: 0, reposts: 0, likes, bookmarks: 0, views: 0 },
  viewer: { liked: false, reposted: false, bookmarked: false, isAuthor: false },
  repostedBy: null,
  replyTo: null,
  quoted: null,
});
const pages = (...items: Post[][]) => ({
  pages: items.map((page): PostPage => ({ items: page, nextCursor: null })),
  pageParams: items.map(() => ''),
});
const likedOnce = (target: Post): Post => ({
  ...target,
  counts: { ...target.counts, likes: target.counts.likes + 1 },
  viewer: { ...target.viewer, liked: true },
});

describe('updatePostInCaches（#21: 同じ投稿の全ての表示を変える）', () => {
  it('全ての一覧（ホームの 2 つのタブ・返信・ブックマーク）の、その ID の投稿だけを書き換える', () => {
    const client = new QueryClient();
    client.setQueryData(['timeline', 'following'], pages([post('1'), post('2')]));
    client.setQueryData(['timeline', 'for-you'], pages([post('3')], [post('1')]));
    client.setQueryData(['replies', '9'], pages([post('1', 5)]));
    client.setQueryData(['bookmarks'], pages([]));
    client.setQueryData(['session'], { name: '太郎' });

    updatePostInCaches(client, '1', likedOnce);

    const read = (key: string[]) =>
      client.getQueryData<ReturnType<typeof pages>>(key)!.pages.flatMap((page) => page.items);
    expect(
      read(['timeline', 'following']).map((p) => [p.id, p.counts.likes, p.viewer.liked]),
    ).toEqual([
      ['1', 1, true],
      ['2', 0, false],
    ]);
    expect(read(['timeline', 'for-you']).map((p) => p.counts.likes)).toEqual([0, 1]);
    expect(read(['replies', '9'])[0].counts.likes).toBe(6);
    expect(client.getQueryData(['session'])).toEqual({ name: '太郎' });
  });
});
