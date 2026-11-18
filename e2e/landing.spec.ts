import { expect, test } from '@playwright/test';

// NFR-I18N-01: 画面の文言は日本語。`<html lang="ja">`
test('/ を開くと x-modoki と出る', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'x-modoki' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
});

test('アイコンを持ち、ブラウザが /favicon.ico を探して 404 にならない', async ({
  page,
  request,
}) => {
  await page.goto('/');
  const href = await page.locator('link[rel="icon"]').first().getAttribute('href');
  expect(href).toBeTruthy();
  const icon = await request.get(href!);
  expect(icon.status()).toBe(200);
});
