import { expect, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';
import { insertPosts } from './support/db';

/** A signed-in user on フォロー中 with `count` posts of their own. */
async function onTimeline(page: Page, count = 3) {
  const me = await signUp(page);
  await insertPosts(me.username, count, 'キーの試し');
  await page.goto('/home?tab=following');
  await expect(page.getByRole('article').first()).toContainText(`キーの試し ${count}`);
  // Start with nothing focused, as after a click on the page.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  return me;
}
const focusedText = (page: Page) =>
  page.evaluate(() => document.activeElement?.closest('article')?.textContent ?? '');

test('n で入力欄が開く。入力欄の中では n は文字になる', async ({ page }) => {
  await onTimeline(page);
  await page.keyboard.press('n');
  const box = page.getByRole('dialog', { name: 'ポストする' }).getByRole('textbox');
  await expect(box).toBeFocused();
  await page.keyboard.type('n');
  await expect(box).toHaveValue('n');
});

test('j / k で次 / 前の投稿を選び、フォーカスの輪が出て、画面の中に入る', async ({ page }) => {
  await onTimeline(page, 30);
  await page.keyboard.press('j');
  await expect.poll(() => focusedText(page)).toContain('キーの試し 30');
  await page.keyboard.press('j');
  await expect.poll(() => focusedText(page)).toContain('キーの試し 29');
  const ring = await page.evaluate(
    () => getComputedStyle(document.activeElement!).outlineStyle !== 'none',
  );
  expect(ring).toBe(true);
  await page.keyboard.press('k');
  await expect.poll(() => focusedText(page)).toContain('キーの試し 30');
  for (let i = 0; i < 12; i += 1) await page.keyboard.press('j');
  await expect.poll(() => focusedText(page)).toContain('キーの試し 18');
  const inView = await page.evaluate(() => {
    const box = document.activeElement!.getBoundingClientRect();
    return box.top >= 0 && box.bottom <= window.innerHeight;
  });
  expect(inView).toBe(true);
});

test('l で選んだ投稿にいいね、t でリポストのメニュー、r で返信の欄', async ({ page }) => {
  await onTimeline(page);
  await page.keyboard.press('j');
  await page.keyboard.press('l');
  const first = page.getByRole('article').first();
  await expect(first.getByRole('button', { name: 'いいね' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('t');
  await expect(page.getByRole('menuitem', { name: 'リポスト' })).toBeVisible();
  await page.keyboard.press('Escape');
  // The menu gives focus back to its button, inside the post, in the next frame.
  await expect(first.getByRole('button', { name: 'リポスト' })).toBeFocused();
  await page.keyboard.press('r');
  await expect(page).toHaveURL(/\/status\/\d+$/);
  await expect(page.getByRole('textbox', { name: '返信の本文' })).toBeFocused();
});

test('g のあと h / n / p で、ホーム / 通知 / プロフィールへ', async ({ page }) => {
  const me = await onTimeline(page);
  await page.keyboard.press('g');
  await page.keyboard.press('n');
  await expect(page).toHaveURL(/\/notifications$/);
  await page.keyboard.press('g');
  await page.keyboard.press('p');
  await expect(page).toHaveURL(new RegExp(`/${me.username}$`));
  await page.keyboard.press('g');
  await page.keyboard.press('h');
  await expect(page).toHaveURL(/\/home$/);
});

test('? でキーの一覧が出て、Esc で閉じる', async ({ page }) => {
  await onTimeline(page);
  await page.keyboard.press('?');
  const list = page.getByRole('dialog', { name: 'キーボードショートカット' });
  await expect(list).toBeVisible();
  await expect(list).toContainText('新しいポスト');
  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
});
