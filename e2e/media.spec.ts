import { expect, test } from '@playwright/test';
import { signUp } from './support/auth';
import { pngFile } from './support/images';

// FR-POST-05: 画像つきの投稿
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

// FR-POST-06: 画像でないもの・5MB を超えるものは拒まれる
test('画像を選ぶ欄は 4 つの形式だけを受け付け、画像でないファイルと 5MB を超える GIF は送れない（#30）', async ({
  page,
}) => {
  await signUp(page);
  await page.goto('/home?tab=following');
  const input = page.getByLabel('画像を追加');
  await expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
  // A 1×1 GIF padded past 5MB: GIFs are sent as they are, so its size is what is checked.
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  const big = Buffer.concat([gif, Buffer.alloc(5 * 1024 * 1024)]);
  for (const file of [
    { name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('画像ではない') },
    { name: 'big.gif', mimeType: 'image/gif', buffer: big },
  ]) {
    // A fresh screen for each file, so one refusal is not read as the other's.
    await page.goto('/home?tab=following');
    await input.setInputFiles(file);
    await expect(
      page.getByRole('alert').filter({ hasText: '画像を送れませんでした' }),
    ).toBeVisible();
  }
});

test('送れなかった画像を外すと、「画像を送れませんでした」も消える（#90）', async ({ page }) => {
  await signUp(page);
  await page.goto('/home?tab=following');
  // The storage refuses the upload.
  await page.route('http://localhost:3900/**', (route) => route.abort());
  await page.getByLabel('画像を追加').setInputFiles(await pngFile(page, 300, 200));
  await expect(page.getByText('画像を送れませんでした')).toBeVisible();
  await page.getByRole('button', { name: '1 枚目を外す' }).click();
  await expect(page.getByText('画像を送れませんでした')).toHaveCount(0);
});
