import { expect, test } from '@playwright/test';
import { signUp } from './support/auth';
import { insertPosts } from './support/db';

test('一覧から詳細へ進んで戻ると、スクロールの位置と読み込んだ続きが元のまま', async ({ page }) => {
  const me = await signUp(page);
  // Two pages of 20: the second is read only by scrolling down.
  await insertPosts(me.username, 30, '戻る試し');
  await page.goto('/home?tab=following');
  await expect(page.getByRole('article').first()).toContainText('戻る試し 30');
  const deep = page
    .getByRole('article')
    .filter({ has: page.getByText('戻る試し 5', { exact: true }) });
  // Scroll at once, not with the wheel: a busy machine still plays wheel scrolls after the test has
  // read the position, and the screen then ends up somewhere else.
  for (let i = 0; i < 30 && !(await deep.isVisible()); i += 1) {
    await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'instant' }));
  }
  // Bring it to the middle at once: a wheel scroll may still be moving, and its position is not
  // where the screen ends up (as in #56).
  await deep.evaluate((card) => card.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const scrollY = () => page.evaluate(() => window.scrollY);
  // Rows drawn by that move are measured next, which can still shift the page: take the position
  // once it has held for 300ms.
  let before = await scrollY();
  await expect
    .poll(async () => before === (before = await scrollY()), { intervals: [300] })
    .toBe(true);
  expect(before).toBeGreaterThan(1000);

  await deep.getByText('戻る試し 5').click();
  await expect(page).toHaveURL(new RegExp(`/${me.username}/status/\\d+$`));
  await page.goBack();
  await expect(page).toHaveURL(/\/home\?tab=following$/);
  // The second page is still there, and the screen is where it was.
  await expect(deep).toBeVisible();
  await expect.poll(scrollY).toBeGreaterThan(before - 5);
  expect(await scrollY()).toBeLessThan(before + 5);
});
