import { expect, test } from '@playwright/test';
import { signUp } from './support/auth';
import { pngFile } from './support/images';

test('プロフィールの編集で、アバターとバナーを変えられる', async ({ page }) => {
  const me = await signUp(page);
  await page.goto('/settings/profile');
  await page.getByLabel('アバターの画像を選ぶ').setInputFiles(await pngFile(page, 600, 300));
  await page.getByLabel('バナーの画像を選ぶ').setInputFiles(await pngFile(page, 3000, 1200));
  // Each preview is the cropped image, ready once it has been sent.
  const avatar = page.getByRole('img', { name: '新しいアバター' });
  const banner = page.getByRole('img', { name: '新しいバナー' });
  await expect(avatar).toHaveAttribute('width', '400');
  await expect(avatar).toHaveAttribute('height', '400');
  await expect(banner).toHaveAttribute('width', '1500');
  await expect(banner).toHaveAttribute('height', '500');
  const save = page.getByRole('button', { name: '保存' });
  await expect(save).toBeEnabled();
  await save.click();

  await expect(page).toHaveURL(new RegExp(`/${me.username}$`));
  const header = page.getByRole('region', { name: 'プロフィール' });
  // Served by the media host, not the app (ADR-0008).
  await expect(header.locator('img').first()).toHaveAttribute(
    'src',
    /^http:\/\/[^/]*web\.garage\.localhost:3902\//,
  );
  await expect(header.getByRole('img', { name: me.name })).toHaveAttribute(
    'src',
    /^http:\/\/[^/]*web\.garage\.localhost:3902\//,
  );
  // The account menu shows the new avatar too, from the media host (not the stored key).
  await expect(
    page.getByRole('button', { name: 'アカウントのメニュー' }).locator('img'),
  ).toHaveAttribute('src', /^http:\/\/[^/]*web\.garage\.localhost:3902\//);
});
