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

test('入力欄は内容に合わせて伸び、消すと縮む', async ({ page }) => {
  await signUp(page);
  const height = async () => (await composer(page).boundingBox())!.height;
  const oneLine = await height();
  await composer(page).fill('1\n2\n3\n4\n5');
  await expect.poll(height).toBeGreaterThan(oneLine + 40);
  await composer(page).fill('1');
  await expect.poll(height).toBeLessThanOrEqual(oneLine + 1);
});

test('投稿したあとも、高さの違うカードどうしが重ならない（#48）', async ({ page }) => {
  await signUp(page);
  await page.goto('/home?tab=following');
  const composer = page.getByRole('textbox', { name: '投稿の本文' });
  await composer.fill('元の投稿');
  await page.getByRole('button', { name: 'ポストする' }).click();
  await expect(page.getByRole('article').first()).toContainText('元の投稿');
  // A quote is taller than the post it quotes.
  await page.getByRole('article').first().getByRole('button', { name: 'リポスト' }).click();
  await page.getByRole('menuitem', { name: '引用' }).click();
  const dialog = page.getByRole('dialog', { name: '引用' });
  await dialog.getByRole('textbox', { name: '引用の本文' }).fill('引用した');
  await dialog.getByRole('button', { name: 'ポストする' }).click();
  await expect(page.getByRole('article').first()).toContainText('引用した');
  // The page's first rows are measured from the server's page; a new post on top then shifts
  // every row down by one (the case seen in Chrome, #48).
  await page.reload();
  await composer.fill('一番新しい');
  await page.getByRole('button', { name: 'ポストする' }).click();
  await expect(page.getByRole('article').first()).toContainText('一番新しい');
  await page.waitForTimeout(500);
  const cards = page.locator('[data-index] > article');
  const boxes = await cards.evaluateAll((articles) =>
    articles.map((article) => {
      const box = article.getBoundingClientRect();
      return [box.top, box.bottom];
    }),
  );
  expect(boxes).toHaveLength(3);
  for (let i = 1; i < boxes.length; i++)
    expect(boxes[i][0]).toBeGreaterThanOrEqual(boxes[i - 1][1] - 1);
});
