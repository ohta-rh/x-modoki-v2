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
