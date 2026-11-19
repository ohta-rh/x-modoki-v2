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

test('オフラインのログイン・登録・ログアウトは知らせて、入れた値を残す（#82）', async ({
  page,
  context,
}) => {
  const offline = '通信できませんでした。もう一度お試しください';
  await page.goto('/i/flow/login');
  await page.getByLabel('ユーザー名またはメールアドレス').fill('someone_offline');
  await page.getByLabel('パスワード').fill('correct-horse-battery');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await expect(page.getByRole('alert').filter({ hasText: offline })).toBeVisible();
  await expect(page.getByLabel('ユーザー名またはメールアドレス')).toHaveValue('someone_offline');
  await context.setOffline(false);

  await page.goto('/i/flow/signup');
  await page.getByLabel('名前').fill('オフラインの人');
  await page.getByLabel('ユーザー名').fill('offline_person');
  await page.getByLabel('メールアドレス').fill('offline_person@example.test');
  await page.getByLabel('パスワード').fill('correct-horse-battery');
  await context.setOffline(true);
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page.getByRole('alert').filter({ hasText: offline })).toBeVisible();
  await expect(page.getByLabel('ユーザー名')).toHaveValue('offline_person');
  await context.setOffline(false);

  await signUp(page);
  await page.getByRole('button', { name: /のアカウントのメニュー$/ }).click();
  await context.setOffline(true);
  await page.getByRole('menuitem', { name: /からログアウト$/ }).click();
  // The toast, by its heading (the form's own message is a paragraph).
  await expect(page.getByRole('heading', { name: offline })).toBeVisible();
  await expect(page).toHaveURL(/\/home$/);
});

test('登録とログアウトが通ったときは、通信の文言を出さない（#82 のレビュー 1）', async ({
  page,
}) => {
  const offline = '通信できませんでした。もう一度お試しください';
  await signUp(page);
  // The sign-up screen Next.js keeps hidden must not hold the message either.
  await page.goBack();
  await expect(page).toHaveURL(/\/i\/flow\/signup$/);
  await expect(page.getByRole('heading', { name: 'x-modoki に登録' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(offline)).toHaveCount(0);
  await page.goto('/home');
  await page.getByRole('button', { name: /のアカウントのメニュー$/ }).click();
  await page.getByRole('menuitem', { name: /からログアウト$/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.waitForTimeout(500);
  await expect(page.getByText(offline)).toHaveCount(0);
});

test('削除の応答が届かずにやり直しても、投稿は消える（#84）', async ({ page }) => {
  const me = await signUp(page);
  await page.goto('/home?tab=following');
  await page.getByRole('textbox', { name: '投稿の本文' }).fill('応答の届かない削除');
  await page.getByRole('button', { name: 'ポストする' }).click();
  await expect(page.getByRole('article').first()).toContainText('応答の届かない削除');
  await page.goto(`/${me.username}`);
  const post = page.getByRole('article').filter({ hasText: '応答の届かない削除' });
  // The delete reaches the server; only its answer is lost.
  let cut = true;
  await page.route(`**/${me.username}`, async (route) => {
    if (cut && route.request().method() === 'POST') {
      cut = false;
      await route.fetch();
      return route.abort('connectionreset');
    }
    return route.fallback();
  });
  await post.getByRole('button', { name: 'もっと見る' }).click();
  await page.getByRole('menuitem', { name: '削除' }).click();
  const dialog = page.getByRole('alertdialog');
  await dialog.getByRole('button', { name: '削除' }).click();
  await expect(dialog.getByText('通信できませんでした。もう一度お試しください')).toBeVisible();
  await dialog.getByRole('button', { name: '削除' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(post).toHaveCount(0);
});
