import { expect, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';

async function postFromHome(page: Page, text: string) {
  await page.goto('/home?tab=following');
  await page.getByRole('textbox', { name: '投稿の本文' }).fill(text);
  await page.getByRole('button', { name: 'ポストする' }).click();
  await expect(page.getByRole('article').first()).toContainText(text);
}

test('/{username} に名前と自己紹介が出る。ログイン無しでも見られ、無いユーザー名は 404', async ({
  page,
  browser,
}) => {
  const me = await signUp(page);
  await postFromHome(page, 'プロフィールに出る投稿');
  await page.goto(`/${me.username}`);
  const header = page.getByRole('region', { name: 'プロフィール' });
  await expect(header.getByRole('heading', { level: 2, name: me.name })).toBeVisible();
  await expect(header).toContainText(`@${me.username}`);
  await expect(header).toContainText(/\d{4}年\d{1,2}月から利用しています/);
  await expect(header).toContainText('0 フォロー中');
  await expect(header).toContainText('0 フォロワー');
  await expect(page.getByRole('article').first()).toContainText('プロフィールに出る投稿');
  // The いいね tab is the owner's only.
  await expect(page.getByRole('tab', { name: 'いいね' })).toBeVisible();

  const stranger = await (await browser.newContext()).newPage();
  await stranger.goto(`/${me.username}`);
  await expect(stranger.getByRole('heading', { level: 2, name: me.name })).toBeVisible();
  await expect(stranger.getByRole('tab', { name: 'いいね' })).toHaveCount(0);
  await stranger.goto('/no_such_user_zz');
  await expect(
    stranger.getByRole('heading', { name: 'このアカウントは存在しません' }),
  ).toBeVisible();
});

test('プロフィールを編集はモーダルで開き、保存すると変わる。直接開くとページになる', async ({
  page,
}) => {
  const me = await signUp(page);
  await page.goto(`/${me.username}`);
  await page.getByRole('link', { name: 'プロフィールを編集' }).click();
  const dialog = page.getByRole('dialog', { name: 'プロフィールを編集' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: '自己紹介' }).fill('猫が好きです');
  await dialog.getByRole('textbox', { name: 'ウェブサイト' }).fill('ftp://example.com');
  await dialog.getByRole('button', { name: '保存' }).click();
  await expect(dialog.getByText('http か https の URL を入れてください')).toBeVisible();
  await dialog.getByRole('textbox', { name: 'ウェブサイト' }).fill('https://example.com');
  await dialog.getByRole('button', { name: '保存' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/${me.username}$`));
  await expect(page.getByRole('region', { name: 'プロフィール' })).toContainText('猫が好きです');

  await page.goto('/settings/profile');
  await expect(page.getByRole('heading', { level: 1, name: 'プロフィールを編集' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '自己紹介' })).toHaveValue('猫が好きです');
});

test('自分の投稿を固定すると、プロフィールの先頭に「固定」と付いて出る', async ({ page }) => {
  const me = await signUp(page);
  await postFromHome(page, '固定する投稿');
  await postFromHome(page, 'あとの投稿');
  await page.goto(`/${me.username}`);
  const target = page.getByRole('article').filter({ hasText: '固定する投稿' });
  await target.getByRole('button', { name: 'もっと見る' }).click();
  // Wait for the Server Action itself before reloading, or the reload can cancel it.
  const pinned = page.waitForResponse((r) => r.request().headers()['next-action'] !== undefined);
  await page.getByRole('menuitem', { name: 'プロフィールに固定する' }).click();
  await pinned;
  await page.reload();
  const first = page.getByRole('article').first();
  await expect(first).toContainText('固定');
  await expect(first).toContainText('固定する投稿');
});

test('アバターに約 0.5 秒ホバーすると、プロフィールの小さなカードが出る', async ({ page }) => {
  const me = await signUp(page);
  await postFromHome(page, 'ホバーする投稿');
  await page
    .getByRole('article')
    .first()
    .getByRole('link', { name: `${me.name} のプロフィール` })
    .hover();
  const card = page.getByRole('dialog', { name: `${me.name} のプロフィールのカード` });
  await expect(card).toBeVisible();
  await expect(card).toContainText(`@${me.username}`);
});
