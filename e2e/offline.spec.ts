import { expect, test } from '@playwright/test';
import { signUp } from './support/auth';
import { insertPosts } from './support/db';

// 通信が切れても、画面が壊れず、知らせが出て、やり直せる（#70・#72）
test.describe('通信が切れたとき（#34 の探索的テスト）', () => {
  test('オフラインで投稿しても画面は誤りにならず、文字が残り、つながってから送れる（#70）', async ({
    page,
    context,
  }) => {
    await signUp(page);
    await page.goto('/home?tab=following');
    const box = page.getByRole('textbox', { name: '投稿の本文' });
    await box.fill('つながらないときの投稿');
    await context.setOffline(true);
    await page.getByRole('button', { name: 'ポストする' }).click();
    await expect(page.getByText('通信できませんでした。もう一度お試しください')).toBeVisible();
    await expect(box).toHaveValue('つながらないときの投稿');
    await context.setOffline(false);
    await page.getByRole('button', { name: 'ポストする' }).click();
    await expect(page.getByRole('article').first()).toContainText('つながらないときの投稿');
    await expect(page.getByRole('article')).toHaveCount(1);
  });

  test('オフラインでフォローすると、元に戻してトーストで知らせる（#70）', async ({
    page,
    context,
  }) => {
    const other = await signUp(page);
    await page.context().clearCookies();
    await signUp(page);
    await page.goto(`/${other.username}`);
    const profile = page.getByRole('region', { name: 'プロフィール' });
    const follow = profile.getByRole('button', { name: 'フォロー', exact: true });
    await expect(follow).toBeVisible();
    await context.setOffline(true);
    await follow.click();
    await expect(page.getByText('通信できませんでした。もう一度お試しください')).toBeVisible();
    await expect(profile.getByRole('button', { name: 'フォロー', exact: true })).toBeVisible();
  });

  test('オフラインで一覧を下まで送ると知らせが出て、つながると続きが出る（#72）', async ({
    page,
    context,
  }) => {
    const me = await signUp(page);
    await insertPosts(me.username, 30, '続きの投稿');
    await page.goto('/home?tab=following');
    await expect(page.getByRole('article').first()).toBeVisible();
    await context.setOffline(true);
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
    );
    await expect(page.getByText('オフラインです。つながると続きを読み込みます')).toBeVisible();
    const next = page.waitForResponse(
      (response) => response.url().includes('/api/timeline/following?cursor=') && response.ok(),
    );
    await context.setOffline(false);
    await next;
    await expect(page.getByText('オフラインです。つながると続きを読み込みます')).toHaveCount(0);
  });
});

test('投稿の応答が届かずにやり直しても、投稿は 1 つだけ（#76）', async ({ page }) => {
  await signUp(page);
  await page.goto('/home?tab=following');
  await page.getByRole('textbox', { name: '投稿の本文' }).fill('応答が届かない投稿');
  // The post reaches the server; only its answer is lost.
  let cut = true;
  await page.route('**/home?tab=following', async (route) => {
    if (cut && route.request().method() === 'POST') {
      cut = false;
      await route.fetch();
      return route.abort('connectionreset');
    }
    return route.fallback();
  });
  await page.getByRole('button', { name: 'ポストする' }).click();
  await expect(page.getByText('通信できませんでした。もう一度お試しください')).toBeVisible();
  await page.getByRole('button', { name: 'ポストする' }).click();
  await expect(page.getByRole('article').first()).toContainText('応答が届かない投稿');
  await page.reload();
  await expect(page.getByRole('article').first()).toContainText('応答が届かない投稿');
  await expect(page.getByRole('article')).toHaveCount(1);
});
