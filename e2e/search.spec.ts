import { expect, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';

async function postFromHome(page: Page, text: string) {
  await page.goto('/home?tab=following');
  await page.getByRole('textbox', { name: '投稿の本文' }).fill(text);
  await page.getByRole('button', { name: 'ポストする' }).click();
  await expect(page.getByRole('article').first()).toContainText(text);
}

test('本文の語で検索すると、その投稿が出る', async ({ page }) => {
  await signUp(page);
  const word = `検索語${Date.now().toString(36)}`;
  await postFromHome(page, `今日は ${word} の話`);
  await page.goto('/explore');
  const box = page.getByRole('searchbox', { name: '検索' }).first();
  await box.fill(word);
  await box.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/search\\?q=${encodeURIComponent(word)}`));
  await expect(page.getByRole('article').first()).toContainText(`今日は ${word} の話`);
});

test('右サイドバーの検索の欄からも進む。空の検索は進まない', async ({ page }) => {
  await signUp(page);
  await page.goto('/home?tab=following');
  const box = page.getByRole('complementary').getByRole('searchbox', { name: '検索' });
  await box.press('Enter');
  await expect(page).toHaveURL(/\/home\?tab=following$/);
  await box.fill('   ');
  await box.press('Enter');
  await expect(page).toHaveURL(/\/home\?tab=following$/);
  await box.fill('なにか');
  await box.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/search\\?q=${encodeURIComponent('なにか')}`));
});

test('タブで最新・ユーザー・メディアに切り替わる', async ({ page }) => {
  const me = await signUp(page);
  await page.goto(`/search?q=${me.username}`);
  await page.getByRole('tab', { name: 'ユーザー' }).click();
  await expect(page).toHaveURL(/f=user$/);
  await expect(page.getByRole('main').getByText(`@${me.username}`)).toBeVisible();
  await page.getByRole('tab', { name: '最新' }).click();
  await expect(page).toHaveURL(/f=live$/);
  await expect(page.getByRole('tab', { name: '最新' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'メディア' }).click();
  await expect(page.getByText(`「${me.username}」の検索結果はありません`)).toBeVisible();
});

test('ハッシュタグのリンクは、そのタグの検索へ進む。トレンドにも出る', async ({ page }) => {
  await signUp(page);
  const tag = `タグ${Date.now().toString(36)}`;
  await postFromHome(page, `今日の #${tag} です`);
  await page
    .getByRole('article')
    .first()
    .getByRole('link', { name: `#${tag}` })
    .click();
  await expect(page).toHaveURL(new RegExp(`/search\\?q=${encodeURIComponent(`#${tag}`)}`));
  await expect(page.getByRole('article').first()).toContainText(`今日の #${tag} です`);
});

test('1024px 以上で、右サイドバーに検索の欄・トレンド・おすすめユーザーが出る', async ({
  browser,
}) => {
  const page = await (
    await browser.newContext({ viewport: { width: 1100, height: 800 } })
  ).newPage();
  await signUp(page);
  const aside = page.getByRole('complementary');
  await expect(aside.getByRole('searchbox', { name: '検索' })).toBeVisible();
  await expect(aside.getByRole('region', { name: 'いまどうしてる？' })).toBeVisible();
  await expect(aside.getByText('X Corp. とは関係の無い学習用のアプリ')).toBeVisible();
});
