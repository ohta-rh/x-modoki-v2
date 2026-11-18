import { describe, expect, it } from 'vitest';
import type { NotificationItem } from '../model/types';
import { describeGroup, groupNotifications } from './group';

const actor = (n: number) => ({ username: `u${n}`, name: `人${n}`, avatarUrl: null });
const post = (id: string) => ({ id, text: '本文', authorUsername: 'me' });
const item = (
  id: string,
  type: NotificationItem['type'],
  who: number,
  postId: string | null,
  read = false,
): NotificationItem => ({
  id,
  type,
  createdAt: `2026-11-18T03:00:0${id}.000Z`,
  read,
  actor: actor(who),
  post: postId === null ? null : post(postId),
});

describe('groupNotifications（#26、ui-ux.md の通知）', () => {
  it('いいね・リポスト・フォローは種類と投稿が同じものを、新しい順の最初の位置にまとめる', () => {
    const groups = groupNotifications([
      item('9', 'like', 1, 'p1'),
      item('8', 'follow', 2, null),
      item('7', 'like', 3, 'p1', true),
      item('6', 'like', 4, 'p2'),
      item('5', 'follow', 5, null, true),
      item('4', 'repost', 1, 'p1'),
    ]);
    expect(
      groups.map((g) => [g.type, g.post?.id ?? null, g.actors.map((a) => a.username), g.read]),
    ).toEqual([
      ['like', 'p1', ['u1', 'u3'], false],
      ['follow', null, ['u2', 'u5'], false],
      ['like', 'p2', ['u4'], false],
      ['repost', 'p1', ['u1'], false],
    ]);
    expect(groups[0].createdAt).toBe('2026-11-18T03:00:09.000Z');
  });

  it('返信・引用・メンションは 1 件ずつ。全部読んだまとまりは既読', () => {
    const groups = groupNotifications([
      item('3', 'reply', 1, 'r1', true),
      item('2', 'mention', 2, 'm1'),
      item('1', 'like', 3, 'p1', true),
    ]);
    expect(groups.map((g) => [g.type, g.actors.length, g.read])).toEqual([
      ['reply', 1, true],
      ['mention', 1, false],
      ['like', 1, true],
    ]);
  });
});

describe('describeGroup（#26）', () => {
  const group = (type: NotificationItem['type'], people: number) =>
    groupNotifications(
      Array.from({ length: people }, (_, i) =>
        item(String(i + 1), type, i + 1, type === 'follow' ? null : 'p1'),
      ),
    )[0];

  it('1 人なら「A さんが…」、ほかにもいれば「A さんと他 N 人が…」', () => {
    expect(describeGroup(group('like', 1))).toBe('人1さんがあなたのポストをいいねしました');
    expect(describeGroup(group('like', 3))).toBe('人1さんと他2人があなたのポストをいいねしました');
    expect(describeGroup(group('repost', 2))).toBe(
      '人1さんと他1人があなたのポストをリポストしました',
    );
    expect(describeGroup(group('follow', 1))).toBe('人1さんにフォローされました');
    expect(describeGroup(group('follow', 2))).toBe('人1さんと他1人にフォローされました');
    expect(describeGroup(group('reply', 1))).toBe('人1さんが返信しました');
    expect(describeGroup(group('quote', 1))).toBe('人1さんがあなたのポストを引用しました');
    expect(describeGroup(group('mention', 1))).toBe('人1さんがあなたをメンションしました');
  });
});
