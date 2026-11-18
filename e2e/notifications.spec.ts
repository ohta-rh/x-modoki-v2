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

const notificationsLink = (page: Page) =>
  page.getByRole('navigation', { name: 'メインのメニュー' }).getByRole('link', { name: /^通知/ });

test('いいねされると、未読の数が 1 になる', async ({ browser }) => {
  const authorPage = await (await browser.newContext()).newPage();
  const author = await signUp(authorPage);
  await postFromHome(authorPage, 'いいねされる投稿');
  await expect(notificationsLink(authorPage)).toHaveAccessibleName('通知');

  const likerPage = await (await browser.newContext()).newPage();
  await signUp(likerPage);
  await likerPage.goto(`/${author.username}`);
  const liked = actionDone(likerPage);
  await likerPage
    .getByRole('article')
    .filter({ hasText: 'いいねされる投稿' })
    .getByRole('button', { name: 'いいね' })
    .click();
  await liked;

  await authorPage.reload();
  await expect(notificationsLink(authorPage)).toHaveAccessibleName('通知 未読 1 件');
});

async function likeFrom(browser: import('@playwright/test').Browser, author: string, text: string) {
  const page = await (await browser.newContext()).newPage();
  const account = await signUp(page);
  await page.goto(`/${author}`);
  const liked = actionDone(page);
  await page
    .getByRole('article')
    .filter({ hasText: text })
    .getByRole('button', { name: 'いいね' })
    .click();
  await liked;
  return account;
}

test('2 人のいいねは 1 行にまとまり、通知を開くと既読になってバッジが消える', async ({
  browser,
}) => {
  const authorPage = await (await browser.newContext()).newPage();
  const author = await signUp(authorPage);
  await postFromHome(authorPage, 'まとめられる投稿');
  const first = await likeFrom(browser, author.username, 'まとめられる投稿');
  await likeFrom(browser, author.username, 'まとめられる投稿');

  await authorPage.reload();
  await expect(notificationsLink(authorPage)).toHaveAccessibleName('通知 未読 2 件');
  const read = actionDone(authorPage);
  await notificationsLink(authorPage).click();
  await expect(authorPage).toHaveURL(/\/notifications$/);
  const row = authorPage.getByRole('article').first();
  await expect(row).toContainText(/さんと他1人があなたのポストをいいねしました/);
  await expect(row).toContainText('まとめられる投稿');
  await expect(row.locator('[data-icon="like"]')).toBeVisible();
  await expect(row.getByRole('link', { name: first.name })).toBeVisible();
  await read;
  await expect(notificationsLink(authorPage)).toHaveAccessibleName('通知');
  await authorPage.reload();
  await expect(notificationsLink(authorPage)).toHaveAccessibleName('通知');
});

test('メンションのタブには、メンションだけが出る', async ({ browser }) => {
  const authorPage = await (await browser.newContext()).newPage();
  const author = await signUp(authorPage);
  await postFromHome(authorPage, 'いいねだけの投稿');
  await likeFrom(browser, author.username, 'いいねだけの投稿');
  const otherPage = await (await browser.newContext()).newPage();
  const other = await signUp(otherPage);
  await postFromHome(otherPage, `@${author.username} こんにちは`);

  await authorPage.goto('/notifications/mentions');
  await expect(authorPage.getByRole('tab', { name: 'メンション' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(authorPage.getByRole('article')).toHaveCount(1);
  await expect(authorPage.getByRole('article')).toContainText(
    `${other.name}さんがあなたをメンションしました`,
  );
});

test('未読の数は 30 秒ごとに確かめる（時計を進める）', async ({ browser }) => {
  const authorPage = await (await browser.newContext()).newPage();
  const author = await signUp(authorPage);
  await postFromHome(authorPage, '待っている投稿');
  await authorPage.clock.install();
  await authorPage.reload();
  await expect(notificationsLink(authorPage)).toHaveAccessibleName('通知');
  await likeFrom(browser, author.username, '待っている投稿');
  await authorPage.clock.fastForward('00:31');
  await expect(notificationsLink(authorPage)).toHaveAccessibleName('通知 未読 1 件');
});
