import { expect, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';

async function postFromHome(page: Page, text: string) {
  await page.goto('/home?tab=following');
  await page.getByRole('textbox', { name: '投稿の本文' }).fill(text);
  await page.getByRole('button', { name: 'ポストする' }).click();
  await expect(page.getByRole('article').first()).toContainText(text);
}

const card = (page: Page, text: string) => page.getByRole('article').filter({ hasText: text });
const actionDone = (page: Page) =>
  page.waitForResponse((response) => response.request().headers()['next-action'] !== undefined);

// FR-CONV-06: リポストの表示
test('リポストすると、タイムラインに「〜さんがリポスト」と出る', async ({ page }) => {
  const me = await signUp(page);
  await postFromHome(page, 'リポストされる投稿');
  const repost = card(page, 'リポストされる投稿').first().getByRole('button', { name: 'リポスト' });
  await repost.click();
  const done = actionDone(page);
  await page.getByRole('menuitem', { name: 'リポスト' }).click();
  // The repost green as text on the light page: the shade with 4.5:1 against it (ADR-0054).
  await expect(repost).toHaveCSS('color', 'rgb(0, 119, 79)');
  await expect(repost).toContainText('1');
  await done;
  await page.reload();
  const reposted = page.getByRole('article').filter({ hasText: `${me.name}さんがリポスト` });
  await expect(reposted).toContainText('リポストされる投稿');
  // Undo from the menu: the repost row goes away.
  await reposted.getByRole('button', { name: 'リポスト' }).click();
  const undone = actionDone(page);
  await page.getByRole('menuitem', { name: 'リポストを取り消す' }).click();
  await undone;
  await page.reload();
  await expect(page.getByText(`${me.name}さんがリポスト`)).toHaveCount(0);
});

// FR-CONV-08: 引用
test('引用すると、入れ子のカードの付いた入力欄が開き、投稿すると引用が出る', async ({ page }) => {
  await signUp(page);
  await postFromHome(page, '引用される投稿');
  await card(page, '引用される投稿').getByRole('button', { name: 'リポスト' }).click();
  await page.getByRole('menuitem', { name: '引用' }).click();
  const dialog = page.getByRole('dialog', { name: '引用' });
  const nested = dialog.getByRole('article', { name: '引用した投稿' });
  await expect(nested).toContainText('引用される投稿');
  await expect(nested).toHaveCSS('border-top-width', '1px');
  await expect(nested).toHaveCSS('border-top-left-radius', '16px');
  // As wide as X's composer, not the kit's small dialog (#22, Chrome).
  expect((await dialog.boundingBox())!.width).toBeGreaterThanOrEqual(560);
  await dialog.getByRole('textbox', { name: '引用の本文' }).fill('意見を添える');
  await dialog.getByRole('button', { name: 'ポストする' }).click();
  await expect(dialog).toHaveCount(0);
  const quote = card(page, '意見を添える');
  await expect(quote.getByRole('article', { name: '引用した投稿' })).toContainText(
    '引用される投稿',
  );
});
