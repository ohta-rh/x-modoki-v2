import { expect, type Page, test } from '@playwright/test';
import { signUp, type TestAccount } from './support/auth';
import { insertPosts } from './support/db';

const actionDone = (page: Page) =>
  page.waitForResponse((response) => response.request().headers()['next-action'] !== undefined);

/** Signs up someone, and `page`'s user follows them from their profile. */
async function followSomeone(page: Page): Promise<TestAccount> {
  const theirPage = await (await page.context().browser()!.newContext()).newPage();
  const them = await signUp(theirPage);
  await theirPage.close();
  await page.goto(`/${them.username}`);
  const done = actionDone(page);
  // The profile reads itself again after the follow; leaving before that has finished is reported
  // as an interrupted navigation by WebKit and Firefox (as in #50).
  const refreshed = page.waitForResponse(
    (response) =>
      response.request().headers()['rsc'] === '1' &&
      response.request().headers()['next-action'] === undefined &&
      new URL(response.url()).pathname === `/${them.username}`,
  );
  await page
    .getByRole('region', { name: 'プロフィール' })
    .getByRole('button', { name: 'フォロー', exact: true })
    .click();
  await done;
  await (await refreshed).finished();
  return them;
}

/** To ホーム › フォロー中 through the app's own links, which the router serialises with the
 * profile's refresh after a follow (#50). */
async function openFollowing(page: Page) {
  await page.getByRole('link', { name: 'ホーム', exact: true }).click();
  await page.getByRole('tab', { name: 'フォロー中' }).click();
  await expect(page).toHaveURL(/\/home\?tab=following$/);
}

test('ホームを開いたまま、ほかの人の新しい投稿は 30 秒以内に「N 件のポストを表示」で知らされ、押すまで一覧は動かない', async ({
  page,
}) => {
  await page.clock.install();
  await signUp(page);
  const them = await followSomeone(page);
  await insertPosts(them.username, 1, '前からある投稿');
  await openFollowing(page);
  const first = page.getByRole('article').first();
  await expect(first).toContainText('前からある投稿');

  // One at a time: insertPosts dates a batch back from now, which could put it behind the top.
  await insertPosts(them.username, 1, '一つめの新しい投稿');
  await insertPosts(them.username, 1, '二つめの新しい投稿');
  await page.clock.runFor(30_000);
  const show = page.getByRole('button', { name: '2 件のポストを表示' });
  await expect(show).toBeVisible();
  // Not until it is pressed.
  await expect(first).toContainText('前からある投稿');

  await page.mouse.wheel(0, 300);
  await show.click();
  await expect(first).toContainText('二つめの新しい投稿');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(show).toBeHidden();
});

test.describe('640px 未満', () => {
  test.use({ viewport: { width: 375, height: 800 }, hasTouch: true });

  test('一覧を引っ張ると新しい投稿を読み込む', async ({ page }) => {
    await signUp(page);
    const them = await followSomeone(page);
    await openFollowing(page);
    // The profile just left is kept, hidden, by Next.js (Activity), with its own empty list.
    const empty = page.getByText('まだポストがありません').filter({ visible: true });
    await expect(empty).toBeVisible();
    await insertPosts(them.username, 1, '引っ張って出る投稿');

    // The touch starts on the list itself, as a finger on the screen does.
    const feed = empty;
    const touch = (y: number) => [{ identifier: 0, clientX: 180, clientY: y }];
    await feed.dispatchEvent('touchstart', { touches: touch(200), changedTouches: touch(200) });
    await feed.dispatchEvent('touchmove', { touches: touch(320), changedTouches: touch(320) });
    await feed.dispatchEvent('touchend', { touches: [], changedTouches: touch(320) });
    await expect(page.getByRole('article').first()).toContainText('引っ張って出る投稿');
  });
});
