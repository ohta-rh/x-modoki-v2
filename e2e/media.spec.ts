import { expect, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';

// A small PNG drawn in the page itself, so no binary fixture is kept in the repository.
async function pngFile(page: Page, width: number, height: number) {
  const base64 = await page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#1d9bf0';
      context.fillRect(0, 0, w, h);
      return canvas.toDataURL('image/png').split(',')[1];
    },
    [width, height],
  );
  return {
    name: `photo-${width}x${height}.png`,
    mimeType: 'image/png',
    buffer: Buffer.from(base64, 'base64'),
  };
}

test('画像を付けて投稿すると、カードに画像が出る', async ({ page }) => {
  await signUp(page);
  await page.goto('/home?tab=following');
  const files = [await pngFile(page, 300, 200), await pngFile(page, 200, 300)];
  await page.getByLabel('画像を追加').setInputFiles(files);
  const previews = page.getByRole('group', { name: '添付した画像' }).getByRole('img');
  await expect(previews).toHaveCount(2);
  await page.getByRole('button', { name: '1 枚目の代替テキスト' }).click();
  await page.getByRole('textbox', { name: '代替テキスト' }).fill('青い四角');
  await page.getByRole('button', { name: '代替テキストを保存' }).click();
  await page.getByRole('button', { name: '2 枚目を外す' }).click();
  await expect(previews).toHaveCount(1);
  await page.getByRole('textbox', { name: '投稿の本文' }).fill('写真つきの投稿');
  await page.getByRole('button', { name: 'ポストする' }).click();
  const card = page.getByRole('article').filter({ hasText: '写真つきの投稿' });
  const image = card.getByRole('img', { name: '青い四角' });
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('width', '300');
  await expect(image).toHaveAttribute('height', '200');
  // The image comes from the media host, not the app.
  expect(await image.getAttribute('src')).toMatch(/^http:\/\/[^/]*web\.garage\.localhost:3902\//);
});

test('5 枚目は選べない', async ({ page }) => {
  await signUp(page);
  await page.goto('/home?tab=following');
  const files = await Promise.all([1, 2, 3, 4, 5].map((n) => pngFile(page, 10 * n, 10)));
  await page.getByLabel('画像を追加').setInputFiles(files);
  await expect(page.getByRole('group', { name: '添付した画像' }).getByRole('img')).toHaveCount(4);
  await expect(page.getByText('画像は 4 枚までです')).toBeVisible();
  await expect(page.getByLabel('画像を追加')).toBeDisabled();
});
