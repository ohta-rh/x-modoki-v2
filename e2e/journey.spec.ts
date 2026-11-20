import { expect, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';
import { pngFile } from './support/images';

const actionDone = (page: Page) =>
  page.waitForResponse((response) => response.request().headers()['next-action'] !== undefined);

test('通し: 登録 → プロフィールの編集 → 画像つきの投稿 → 別のユーザーがフォロー・返信・いいね → 通知に届く（#30）', async ({
  browser,
}) => {
  // The author: signs up, edits the profile, posts with an image.
  const page = await (await browser.newContext()).newPage();
  const author = await signUp(page);
  await page.goto(`/${author.username}`);
  await page.getByRole('link', { name: 'プロフィールを編集' }).click();
  const edit = page.getByRole('dialog', { name: 'プロフィールを編集' });
  await edit.getByRole('textbox', { name: '自己紹介' }).fill('通しの試しです');
  await edit.getByRole('button', { name: '保存' }).click();
  await expect(edit).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'プロフィール' })).toContainText('通しの試しです');

  await page.goto('/home?tab=following');
  await page.getByLabel('画像を追加').setInputFiles(await pngFile(page, 300, 200));
  await expect(page.getByRole('group', { name: '添付した画像' }).getByRole('img')).toHaveCount(1);
  await page.getByRole('textbox', { name: '投稿の本文' }).fill('画像つきの通しの投稿');
  await page.getByRole('button', { name: 'ポストする' }).click();
  const post = page.getByRole('article').filter({ hasText: '画像つきの通しの投稿' });
  await expect(post.locator('img')).toHaveCount(1);

  // Someone else: follows the author, opens the post, replies and likes it.
  const other = await (await browser.newContext()).newPage();
  const reader = await signUp(other);
  await other.goto(`/${author.username}`);
  let done = actionDone(other);
  // The profile reads itself again after the follow; wait for that before moving on (#50).
  const refreshed = other.waitForResponse(
    (response) =>
      response.request().headers()['rsc'] === '1' &&
      response.request().headers()['next-action'] === undefined &&
      new URL(response.url()).pathname === `/${author.username}`,
  );
  await other
    .getByRole('region', { name: 'プロフィール' })
    .getByRole('button', { name: 'フォロー', exact: true })
    .click();
  await done;
  await (await refreshed).finished();
  await other.getByText('画像つきの通しの投稿').click();
  await expect(other).toHaveURL(/\/status\/\d+$/);
  await other.getByRole('textbox', { name: '返信の本文' }).fill('通しの返信');
  await other.getByRole('button', { name: '返信' }).click();
  await expect(other.getByRole('region', { name: '返信' })).toContainText('通しの返信');
  done = actionDone(other);
  await other
    .getByRole('article', { name: '投稿の本体' })
    .getByRole('button', { name: 'いいね' })
    .click();
  await done;

  // The author sees all three in the notifications.
  await page.goto('/notifications');
  const list = page.getByRole('main');
  await expect(list).toContainText(`${reader.name}さんにフォローされました`);
  await expect(list).toContainText(`${reader.name}さんが返信しました`);
  await expect(list).toContainText(`${reader.name}さんがあなたのポストをいいねしました`);
});
