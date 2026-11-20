import { expect, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';
import { insertPosts } from './support/db';
import { pngFile } from './support/images';

/** Posts `text` with a 300×200 and a 200×300 image from /home and returns the post's URL. */
async function postWithTwoImages(page: Page, text: string) {
  await page.goto('/home?tab=following');
  await page
    .getByLabel('画像を追加')
    .setInputFiles([await pngFile(page, 300, 200), await pngFile(page, 200, 300)]);
  await expect(page.getByRole('group', { name: '添付した画像' }).getByRole('img')).toHaveCount(2);
  await page.getByRole('textbox', { name: '投稿の本文' }).fill(text);
  await page.getByRole('button', { name: 'ポストする' }).click();
  const card = page.getByRole('article').filter({ hasText: text });
  // Images with no alternative text are presentational: count the elements, not the role.
  await expect(card.locator('img')).toHaveCount(2);
  return card;
}

// FR-VIEW-03: 画像のビューア
// FR-VIEW-04: ビューアの操作
test('画像を押すとビューアが重なり、左右のキーで前後へ、Esc で前の画面へスクロールの位置のまま戻る', async ({
  page,
}) => {
  const me = await signUp(page);
  await insertPosts(me.username, 20, '下の投稿');
  const card = await postWithTwoImages(page, 'ビューアの投稿');
  // Scroll at once and wait for the position to settle: a wheel scroll is still moving when its
  // first position is read, and clicking then lets WebKit end up back at the top (#56).
  await page.evaluate(() => window.scrollTo(0, 80));
  const scrollY = () => page.evaluate(() => window.scrollY);
  await expect.poll(scrollY).toBe(80);

  await card.getByRole('link', { name: '1 枚目の画像' }).click();
  await expect(page).toHaveURL(new RegExp(`/${me.username}/status/\\d+/photo/1$`));
  const viewer = page.getByRole('dialog', { name: '画像' });
  await expect(viewer.locator('img')).toHaveAttribute('width', '300');
  // The screen behind, where the viewer left it: Playwright scrolls the link into view to click
  // it, so the position before the click is not the one to keep.
  const behind = await scrollY();
  expect(behind).toBeGreaterThan(0);
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\/photo\/2$/);
  await expect(viewer.locator('img')).toHaveAttribute('width', '200');
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/\/photo\/1$/);

  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  await expect(page).toHaveURL(/\/home\?tab=following$/);
  await expect(card).toBeVisible();
  // The dialog locks the page's scroll and restores it on close, rounding a fractional position:
  // within 1px is the same place (a lost screen would be back at the top, hundreds of px away).
  const after = await scrollY();
  expect(Math.abs(after - behind), `behind ${behind}, after ${after}`).toBeLessThanOrEqual(1);
});

test('ビューアの URL を直接開くと詳細の上に出て、閉じると詳細になる', async ({ page }) => {
  await signUp(page);
  const card = await postWithTwoImages(page, '直接開く投稿');
  await card.getByText('直接開く投稿').click();
  await expect(page).toHaveURL(/\/status\/\d+$/);
  const detail = page.url();

  await page.goto(`${detail}/photo/2`);
  const viewer = page.getByRole('dialog', { name: '画像' });
  await expect(viewer.locator('img')).toHaveAttribute('width', '200');
  // Behind the modal the page is hidden from assistive technology, but it is there.
  await expect(
    page.getByRole('article', { name: '投稿の本体', includeHidden: true }),
  ).toContainText('直接開く投稿');
  await viewer.getByRole('button', { name: '閉じる' }).click();
  await expect(viewer).toBeHidden();
  await expect(page).toHaveURL(detail);
});

// NFR-A11Y-05: フォーカスの輪がキーボードで動かしたときに見える
test('ビューアのボタンへ Tab で来ると、背景と差のあるアクセントの色の輪が見える（#31 レビュー 2）', async ({
  page,
}) => {
  await signUp(page);
  const card = await postWithTwoImages(page, '輪を見る投稿');
  await card.getByText('輪を見る投稿').click();
  await expect(page).toHaveURL(/\/status\/\d+$/);
  await page.goto(`${page.url()}/photo/1`);
  const viewer = page.getByRole('dialog', { name: '画像' });
  await expect(viewer.locator('img')).toBeVisible();
  // Tab until a viewer button has the focus.
  await expect(async () => {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BUTTON');
  }).toPass();
  // The ring is the accent as text on the light page (ADR-0054), not a faint hover tint.
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.activeElement!).boxShadow))
    .toContain('rgb(12, 108, 174)');
});

test('無い画像の番号は 404', async ({ page }) => {
  await signUp(page);
  const card = await postWithTwoImages(page, '番号の投稿');
  await card.getByText('番号の投稿').click();
  await expect(page).toHaveURL(/\/status\/\d+$/);
  // Streamed under <Suspense>: the 404 is the not-found screen, as on the detail (#20).
  await page.goto(`${page.url()}/photo/3`);
  await expect(page.getByRole('heading', { name: 'このページは存在しません。' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: '画像' })).toBeHidden();
});
