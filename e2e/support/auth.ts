import { expect, type Page } from '@playwright/test';

export type TestAccount = { name: string; username: string; email: string; password: string };

let counter = 0;

/** A fresh, fictional account; unique across browsers and runs. */
export function newAccount(): TestAccount {
  counter += 1;
  const tag = `${Date.now().toString(36).slice(-6)}${Math.random().toString(36).slice(2, 5)}${counter}`;
  const username = `e2e_${tag}`.slice(0, 15);
  return {
    name: `テストの人 ${tag}`,
    username,
    email: `${username}@example.test`,
    password: 'correct-horse-battery',
  };
}

/** Signs up through the real form and waits for /home. */
export async function signUp(page: Page, account: TestAccount = newAccount()) {
  await page.goto('/i/flow/signup');
  await page.getByLabel('名前').fill(account.name);
  await page.getByLabel('ユーザー名').fill(account.username);
  await page.getByLabel('メールアドレス').fill(account.email);
  await page.getByLabel('パスワード').fill(account.password);
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page).toHaveURL(/\/home$/);
  return account;
}

/** Signs in through the real form with a username or an email address. */
export async function signIn(page: Page, identifier: string, password: string) {
  await page.getByLabel('ユーザー名またはメールアドレス').fill(identifier);
  await page.getByLabel('パスワード').fill(password);
  await page.getByRole('button', { name: 'ログイン' }).click();
}
