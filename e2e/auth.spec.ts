import { expect, test } from '@playwright/test';
import { newAccount, signIn, signUp } from './support/auth';

// FR-AUTH-01: 登録
test('登録すると /home へ進む', async ({ page }) => {
  await signUp(page);
  await expect(page.getByRole('heading', { level: 1, name: 'ホーム' })).toBeVisible();
});

// FR-AUTH-07: ログアウト
test('ログアウトすると / へ戻り、ユーザー名でもメールアドレスでも入り直せる', async ({ page }) => {
  const account = await signUp(page);
  await page.getByRole('button', { name: 'アカウントのメニュー' }).click();
  await page.getByRole('menuitem', { name: `@${account.username}からログアウト` }).click();
  await expect(page).toHaveURL(/\/$/);
  // Let the landing page finish rendering before navigating again (Firefox aborts otherwise).
  await expect(page.getByRole('link', { name: 'アカウントを作成' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.goto('/home');
  await expect(page).toHaveURL(/\/i\/flow\/login\?next=%2Fhome$/);

  await signIn(page, account.username.toUpperCase(), account.password);
  await expect(page).toHaveURL(/\/home$/);

  await page.getByRole('button', { name: 'アカウントのメニュー' }).click();
  await page.getByRole('menuitem', { name: `@${account.username}からログアウト` }).click();
  // Move on by a click, as a person would: a goto here can abort the router's own navigation
  // that is still settling after the sign-out redirect (Firefox: NS_BINDING_ABORTED).
  await page.getByRole('link', { name: 'ログイン' }).click();
  await expect(page).toHaveURL(/\/i\/flow\/login$/);
  await signIn(page, account.email, account.password);
  await expect(page).toHaveURL(/\/home$/);
});

// FR-AUTH-04: ログイン
test('間違えたときは、どちらが違うかを言わない 1 つの文言を出す', async ({ page, browser }) => {
  const account = await signUp(page);
  const other = await browser.newPage();
  await other.goto('/i/flow/login');
  await signIn(other, account.username, 'wrong-password');
  await expect(other.locator('form').getByRole('alert')).toHaveText(
    'ユーザー名・メールアドレスかパスワードが正しくありません',
  );
  await signIn(other, 'no_such_user_x', account.password);
  await expect(other.locator('form').getByRole('alert')).toHaveText(
    'ユーザー名・メールアドレスかパスワードが正しくありません',
  );
  await other.close();
});

// FR-AUTH-05: ログインへの転送
test('ログインが要る画面を開くとログインへ送られ、入ったあと元の画面へ戻る', async ({
  page,
  browser,
}) => {
  const account = await signUp(page);
  const other = await browser.newPage();
  await other.goto('/notifications');
  await expect(other).toHaveURL(/\/i\/flow\/login\?next=%2Fnotifications$/);
  await signIn(other, account.username, account.password);
  await expect(other).toHaveURL(/\/notifications$/);
  await other.close();
});

// NFR-SEC-10: ログインのあとの戻り先は、同じサイトの中のパスだけを受け付ける（開いた転送をしない）
test('戻り先に外の URL を入れても、入ったあとは /home へ進む', async ({ page, browser }) => {
  const account = await signUp(page);
  for (const next of ['https://evil.test/', '//evil.test/', '/\\evil.test']) {
    const other = await browser.newPage();
    await other.goto(`/i/flow/login?next=${encodeURIComponent(next)}`);
    await signIn(other, account.username, account.password);
    await expect(other).toHaveURL(/^http:\/\/localhost:\d+\/home$/);
    await other.close();
  }
});

// FR-AUTH-06: 入口
test('/ は、入っていないときは入口を出し、入っているときは /home へ送る', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'アカウントを作成' })).toHaveAttribute(
    'href',
    '/i/flow/signup',
  );
  await expect(page.getByRole('link', { name: 'ログイン' })).toHaveAttribute(
    'href',
    '/i/flow/login',
  );
  await signUp(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/home$/);
});

test('予約の語と短すぎるパスワードでは登録できず、理由が出る', async ({ page }) => {
  const account = newAccount();
  await page.goto('/i/flow/signup');
  await page.getByLabel('名前').fill(account.name);
  await page.getByLabel('ユーザー名').fill('settings');
  await page.getByLabel('メールアドレス').fill(account.email);
  await page.getByLabel('パスワード').fill('short');
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page.getByText('このユーザー名は使えません')).toBeVisible();
  await expect(page.getByText('パスワードは 8 文字以上にしてください')).toBeVisible();
  await expect(page).toHaveURL(/\/i\/flow\/signup$/);
});
