import { expect, test } from '@playwright/test';
import { signUp } from './support/auth';
import { insertPosts } from './support/db';

// An unexpected exception in the app shows a Japanese error screen that can load again (#71).
test('誤りの画面は日本語で、もう一度読み込める（#71）', async ({ page }) => {
  const me = await signUp(page);
  await insertPosts(me.username, 30, '誤りの前の投稿');
  // The next page comes back in a shape the feed cannot draw: an exception while rendering.
  let broken = true;
  await page.route('**/api/timeline/following?cursor=*', (route) =>
    broken ? route.fulfill({ json: {} }) : route.fallback(),
  );
  await page.goto('/home?tab=following');
  await expect(page.getByRole('article').first()).toBeVisible();
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
  );
  await expect(page.getByRole('heading', { name: '問題が起きました' })).toBeVisible();
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  broken = false;
  await page.getByRole('button', { name: 'もう一度読み込む' }).click();
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible();
  await expect(page.getByRole('article').first()).toBeVisible();
});
