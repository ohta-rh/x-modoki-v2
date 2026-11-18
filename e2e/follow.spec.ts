import { expect, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';

async function postFromHome(page: Page, text: string) {
  await page.goto('/home?tab=following');
  await page.getByRole('textbox', { name: '投稿の本文' }).fill(text);
  await page.getByRole('button', { name: 'ポストする' }).click();
  await expect(page.getByRole('article').first()).toContainText(text);
}

const actionDone = (page: Page) =>
  page.waitForResponse((response) => response.request().headers()['next-action'] !== undefined);

test('フォローすると、相手の投稿が「フォロー中」に出る', async ({ browser }) => {
  const theirPage = await (await browser.newContext()).newPage();
  const them = await signUp(theirPage);
  await postFromHome(theirPage, 'フォローされる人の投稿');

  const page = await (await browser.newContext()).newPage();
  const me = await signUp(page);
  await page.goto(`/${them.username}`);
  const header = page.getByRole('region', { name: 'プロフィール' });
  const follow = header.getByRole('button', { name: 'フォロー', exact: true });
  const done = actionDone(page);
  await follow.click();
  // The pointer still rests on the button, which then offers フォロー解除; move it away.
  await page.mouse.move(0, 0);
  const following = header.getByRole('button', { name: 'フォロー中' });
  await expect(following).toBeVisible();
  await expect(header).toContainText('1 フォロワー');
  await done;
  // On hover the button offers to unfollow, in the danger colour.
  await following.hover();
  await expect(header.getByRole('button', { name: 'フォロー解除' })).toHaveCSS(
    'color',
    'rgb(244, 33, 46)',
  );

  await page.goto('/home?tab=following');
  await expect(page.getByRole('article').first()).toContainText('フォローされる人の投稿');

  await page.goto(`/${them.username}/followers`);
  const row = page.getByRole('listitem').filter({ hasText: `@${me.username}` });
  await expect(row).toBeVisible();
  await page.goto(`/${me.username}/following`);
  await expect(page.getByRole('listitem').filter({ hasText: `@${them.username}` })).toBeVisible();
});

test('ログイン無しでフォローを押すと、ログインへ送られる', async ({ browser, page }) => {
  const them = await signUp(page);
  const stranger = await (await browser.newContext()).newPage();
  await stranger.goto(`/${them.username}`);
  await stranger
    .getByRole('region', { name: 'プロフィール' })
    .getByRole('link', { name: 'フォロー', exact: true })
    .click();
  await expect(stranger).toHaveURL(/\/i\/flow\/login\?next=/);
});
