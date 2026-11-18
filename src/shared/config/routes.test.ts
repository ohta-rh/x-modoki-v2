import { describe, expect, it } from 'vitest';
import { navItems, tabItems } from './routes';

describe('navItems（ui-ux.md の 3 節）', () => {
  it('左ナビの項目が仕様の順で、メッセージはまだ出さない', () => {
    expect(navItems().map((item) => item.label)).toEqual([
      'ホーム',
      '話題を検索',
      '通知',
      'ブックマーク',
      'プロフィール',
    ]);
  });

  it('プロフィールは、ログインしていればその人の URL、していなければログインの画面', () => {
    expect(navItems('taro').find((item) => item.key === 'profile')?.href).toBe('/taro');
    expect(navItems().find((item) => item.key === 'profile')?.href).toBe('/i/flow/login');
  });
});

describe('tabItems', () => {
  it('下のタブバーは ホーム / 検索 / 通知（メッセージはまだ出さない）', () => {
    expect(tabItems.map((item) => [item.label, item.href])).toEqual([
      ['ホーム', '/home'],
      ['検索', '/explore'],
      ['通知', '/notifications'],
    ]);
  });
});
