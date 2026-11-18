import { expect, test } from '@playwright/test';
import { signUp } from './support/auth';
import { insertPosts } from './support/db';

test.describe('右サイドバー（#58）', () => {
  test.use({ viewport: { width: 1280, height: 600 } });

  test('高さの低い画面でも、右サイドバーのフッターまで届く', async ({ page }) => {
    const me = await signUp(page);
    // A page longer than the screen whatever else is in the database (review 1): with a short page
    // the sidebar's overflow scrolled the page itself and hid the bug.
    await insertPosts(me.username, 12, '長いタイムライン');
    await page.goto('/home?tab=following');
    await expect(page.getByRole('article').first()).toBeVisible();
    const aside = page.getByRole('complementary');
    const footer = aside.getByText('X Corp. とは関係の無い学習用のアプリ');
    await footer.scrollIntoViewIfNeeded();
    const box = (await footer.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(600);
  });

  test('ページを送っても、右サイドバーは上に貼り付いたまま', async ({ page }) => {
    const me = await signUp(page);
    // A timeline longer than the screen, so the page itself scrolls.
    await insertPosts(me.username, 12, '長いタイムライン');
    await page.goto('/home?tab=following');
    await expect(page.getByRole('article').first()).toBeVisible();
    const search = page.getByRole('complementary').getByRole('searchbox', { name: '検索' });
    // Over the timeline, where the reader is.
    await page.mouse.move(640, 300);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect.poll(async () => (await search.boundingBox())!.y).toBeLessThan(20);
  });
});
