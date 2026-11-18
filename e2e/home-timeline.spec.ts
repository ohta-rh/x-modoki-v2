import { expect, test } from '@playwright/test';
import { signUp } from './support/auth';
import { insertPosts } from './support/db';

const composer = (page: import('@playwright/test').Page) =>
  page.getByRole('textbox', { name: '投稿の本文' });

// おすすめ shows everyone's posts, including other tests running in parallel; check on フォロー中.
test('投稿すると、タイムラインの先頭に出る', async ({ page }) => {
  await signUp(page);
  await page.goto('/home?tab=following');
  const text = `はじめての投稿 ${Date.now()}`;
  await composer(page).fill(text);
  await page.getByRole('button', { name: 'ポストする' }).click();
  await expect(page.getByRole('article').first()).toContainText(text);
  await expect(composer(page)).toHaveValue('');
});

test('URL・@ユーザー名・#ハッシュタグはリンクになり、HTML は文字のまま出る', async ({ page }) => {
  const me = await signUp(page);
  await page.goto('/home?tab=following');
  await composer(page).fill(`<b>太字</b> https://example.com/a #テスト @${me.username}`);
  await page.getByRole('button', { name: 'ポストする' }).click();
  const card = page.getByRole('article').first();
  await expect(card).toContainText('<b>太字</b>');
  await expect(card.getByRole('link', { name: 'https://example.com/a' })).toHaveAttribute(
    'href',
    'https://example.com/a',
  );
  await expect(card.getByRole('link', { name: '#テスト' })).toHaveAttribute(
    'href',
    /\/search\?q=%23/,
  );
  await expect(card.getByRole('link', { name: `@${me.username}` }).last()).toHaveAttribute(
    'href',
    `/${me.username}`,
  );
});

test('残りの文字数: 超えると赤い数字が出て、投稿ボタンを押せない。空でも押せない', async ({
  page,
}) => {
  await signUp(page);
  const button = page.getByRole('button', { name: 'ポストする' });
  await expect(button).toBeDisabled();
  await composer(page).fill('あ'.repeat(141));
  await expect(page.getByTestId('remaining')).toHaveText('-2');
  await expect(button).toBeDisabled();
  await composer(page).fill('あ'.repeat(140));
  await expect(button).toBeEnabled();
});

test('「フォロー中」は 20 件ずつ読み、下まで行くと続きを読み、最後で止まる。画面の外のカードは DOM から外れる', async ({
  page,
}) => {
  const me = await signUp(page);
  await insertPosts(me.username, 60);
  await page.goto('/home?tab=following');
  await expect(page.getByRole('tab', { name: 'フォロー中', selected: true })).toBeVisible();
  await expect(page.getByRole('article').first()).toContainText('e2e の投稿 60');
  for (
    let i = 0;
    i < 40 && !(await page.getByText('e2e の投稿 1', { exact: true }).isVisible());
    i += 1
  ) {
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(150);
  }
  await expect(page.getByText('e2e の投稿 1', { exact: true })).toBeVisible();
  expect(await page.getByRole('article').count()).toBeLessThan(60);
  await expect(page.getByText('e2e の投稿 60', { exact: true })).toHaveCount(0);
});

test('タブを切り替えると、選んだタブに下線が出る', async ({ page }) => {
  await signUp(page);
  await page.getByRole('tab', { name: 'フォロー中' }).click();
  await expect(page).toHaveURL(/\/home\?tab=following$/);
  const selected = page.getByRole('tab', { selected: true });
  await expect(selected).toHaveText('フォロー中');
  await expect(selected.locator('[data-indicator]')).toHaveCSS('height', '4px');
});

test('入力欄をクリックしても、四角いフォーカスの輪を出さない（X の入力欄と同じ）', async ({
  page,
}) => {
  await signUp(page);
  await composer(page).click();
  await expect(composer(page)).toBeFocused();
  expect(await composer(page).evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
});
