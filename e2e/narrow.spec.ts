import { expect, test } from '@playwright/test';
import { signUp } from './support/auth';
import { insertPosts } from './support/db';

test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

// NFR-COMPAT-02: 画面の幅 360px から、横にスクロールせずに全ての機能を使える
test('幅 360px で、ルーティングの全部の画面が横にはみ出さない（#31）', async ({ page }) => {
  test.slow();
  const wide: Record<string, number> = {};
  const check = async (path: string) => {
    await page.goto(path);
    await expect(page.getByRole('main').or(page.getByRole('dialog')).first(), path).toBeVisible();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    if (width > 360) wide[path] = width;
  };
  for (const path of ['/', '/i/flow/login', '/i/flow/signup']) await check(path);

  const me = await signUp(page);
  await insertPosts(
    me.username,
    3,
    '狭い画面の確かめ https://example.com/a-very-long-path-for-the-narrow-screen',
  );
  await page.goto(`/${me.username}`);
  // The time, not the text: the middle of the text is the link in it.
  await page.getByRole('article').first().locator('time').click();
  await expect(page).toHaveURL(/\/status\/\d+$/);
  const status = new URL(page.url()).pathname;
  for (const path of [
    '/home',
    '/home?tab=following',
    '/explore',
    '/search?q=確かめ',
    '/search?q=確かめ&f=user',
    '/notifications',
    '/notifications/mentions',
    '/i/bookmarks',
    '/compose/post',
    '/settings',
    '/settings/account',
    '/settings/display',
    '/settings/profile',
    `/${me.username}`,
    `/${me.username}/with_replies`,
    `/${me.username}/media`,
    `/${me.username}/likes`,
    `/${me.username}/following`,
    `/${me.username}/followers`,
    status,
  ])
    await check(path);
  expect(wide).toEqual({});
});

// NFR-COMPAT-02: 狭い画面でも、全ての操作が押せる（#65）
test.describe('浮かぶ投稿ボタンと、画面の下の操作（#65）', () => {
  for (const { width, height, path, name } of [
    { width: 375, height: 667, path: '/settings/profile', name: '保存' },
    { width: 320, height: 568, path: '/settings/profile', name: '保存' },
    { width: 320, height: 300, path: '/compose/post', name: 'ポストする' },
  ]) {
    test(`${width}×${height} の ${path} では、${name} が押せ、浮かぶ投稿ボタンは出ない`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await signUp(page);
      await page.goto(path);
      // ポストする is enabled only with a body: give it one, so the press tests the overlap.
      if (path === '/compose/post') {
        await page.getByRole('textbox', { name: '投稿の本文' }).fill('狭い画面から');
      }
      const target = page.getByRole('main').getByRole('button', { name, exact: true });
      await target.scrollIntoViewIfNeeded();
      // A click lands on the button itself, not on something drawn over it.
      await target.click({ trial: true, timeout: 3000 });
      await expect(page.getByRole('link', { name: 'ポストする', exact: true })).toHaveCount(0);
    });
  }

  test('浮かぶ投稿ボタンの出る画面では、いちばん下の中身をボタンより上まで送れる', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const me = await signUp(page);
    await insertPosts(me.username, 8, '下まで送る');
    await page.goto('/home?tab=following');
    await expect(page.getByRole('article').first()).toBeVisible();
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
    );
    const fab = await page.getByRole('link', { name: 'ポストする', exact: true }).boundingBox();
    const footer = await page
      .getByRole('main')
      .getByText('X Corp. とは関係の無い学習用のアプリ')
      .boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(fab!.y);
  });
});
