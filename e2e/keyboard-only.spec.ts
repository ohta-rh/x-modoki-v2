import { expect, type Locator, type Page, test } from '@playwright/test';
import { newAccount, signUp } from './support/auth';
import { insertPosts } from './support/db';

/** Presses Tab until `target` has the focus, as a keyboard user would reach it. */
async function tabTo(page: Page, target: Locator, limit = 80) {
  for (let i = 0; i < limit; i += 1) {
    if (await target.evaluate((element) => element === document.activeElement).catch(() => false)) {
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${target}`);
}

// NFR-A11Y-03: 登録・投稿・返信・いいね・フォロー・検索・設定の変更を、キーボードだけでできる
test('キーボードだけで、登録・投稿・いいね・返信・フォロー・検索・設定の変更ができる（#31）', async ({
  page,
  browser,
}) => {
  test.slow();
  // Someone to follow, made the usual way in another browser.
  const other = await (await browser.newContext()).newPage();
  const them = await signUp(other);
  await insertPosts(them.username, 1, 'キーボードで読む投稿');

  // Sign up.
  const me = newAccount();
  await page.goto('/i/flow/signup');
  for (const [label, value] of [
    ['名前', me.name],
    ['ユーザー名', me.username],
    ['メールアドレス', me.email],
    ['パスワード', me.password],
  ] as const) {
    await tabTo(page, page.getByLabel(label));
    await page.keyboard.type(value);
  }
  await tabTo(page, page.getByRole('button', { name: '登録する' }));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/home$/);

  // Post.
  await page.goto('/home?tab=following');
  await tabTo(page, page.getByRole('textbox', { name: '投稿の本文' }));
  await page.keyboard.type('キーボードだけの投稿');
  await tabTo(page, page.getByRole('main').getByRole('button', { name: 'ポストする' }));
  await page.keyboard.press('Enter');
  const mine = page.getByRole('article').filter({ hasText: 'キーボードだけの投稿' });
  await expect(mine).toBeVisible();

  // Like it.
  const like = mine.getByRole('button', { name: /^いいね/ });
  await tabTo(page, like);
  await page.keyboard.press('Space');
  await expect(like).toHaveAttribute('aria-pressed', 'true');

  // Follow someone.
  await page.goto(`/${them.username}`);
  const follow = page
    .getByRole('region', { name: 'プロフィール' })
    .getByRole('button', { name: 'フォロー', exact: true });
  await tabTo(page, follow);
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('region', { name: 'プロフィール' }).getByRole('button', { name: /フォロー中/ }),
  ).toBeVisible();

  // Open their post with j and Enter, and reply to it.
  await page.goto(`/${them.username}`);
  const theirs = page.getByRole('article').filter({ hasText: 'キーボードで読む投稿' });
  // The keys work once the page is live: press j until the post is selected.
  await expect(async () => {
    await page.keyboard.press('j');
    await expect(theirs).toBeFocused({ timeout: 500 });
  }).toPass();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/status\/\d+$/);
  await tabTo(page, page.getByRole('textbox', { name: '返信の本文' }));
  await page.keyboard.type('キーボードの返信');
  await tabTo(page, page.getByRole('button', { name: '返信', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: '返信' })).toContainText('キーボードの返信');

  // Search.
  await page.goto('/explore');
  await tabTo(page, page.getByRole('main').getByRole('searchbox', { name: '検索' }));
  await page.keyboard.type('キーボードで読む');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByRole('article').first()).toContainText('キーボードで読む投稿');

  // Change a setting.
  await page.goto('/settings/display');
  const dark = page.getByRole('radio', { name: 'ブラック' });
  await tabTo(page, page.getByRole('radio', { name: 'デフォルト' }));
  // Arrow keys move through a radio group.
  for (let i = 0; i < 3 && !(await dark.isChecked()); i += 1)
    await page.keyboard.press('ArrowRight');
  await expect(dark).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
