import { expect, test } from '@playwright/test';
import { signUp } from './support/auth';

test('ダイアログとトーストの閉じるボタンは「閉じる」という名前（#57）', async ({ page }) => {
  await signUp(page);
  await page.getByRole('navigation').getByRole('link', { name: '投稿する' }).click();
  const composer = page.getByRole('dialog', { name: 'ポストする' });
  await expect(composer.getByRole('button', { name: '閉じる' })).toBeVisible();
  await composer.getByRole('textbox', { name: '投稿の本文' }).fill('閉じるボタンの確認');
  await composer.getByRole('button', { name: 'ポストする' }).click();
  const toast = page.getByText('ポストを送信しました');
  await expect(toast).toBeVisible();
  // Base UI shows a toast's close button to assistive technology once the toasts are expanded
  // (pointer over them, or focus in them).
  await toast.hover();
  await expect(page.getByRole('button', { name: '閉じる' })).toBeVisible();
});
