import { expect, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';
import { insertPosts } from './support/db';

/** A signed-in user on フォロー中 with `count` posts of their own. */
async function onTimeline(page: Page, count = 3) {
  const me = await signUp(page);
  await insertPosts(me.username, count, 'キーの試し');
  await page.goto('/home?tab=following');
  await expect(page.getByRole('article').first()).toContainText(`キーの試し ${count}`);
  // Start with nothing focused, as after a click on the page.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  return me;
}
const focusedText = (page: Page) =>
  page.evaluate(() => document.activeElement?.closest('article')?.textContent ?? '');

test('n で入力欄が開く。入力欄の中では n は文字になる', async ({ page }) => {
  await onTimeline(page);
  await page.keyboard.press('n');
  const box = page.getByRole('dialog', { name: 'ポストする' }).getByRole('textbox');
  await expect(box).toBeFocused();
  await page.keyboard.type('n');
  await expect(box).toHaveValue('n');
});

test('j / k で次 / 前の投稿を選び、フォーカスの輪が出て、画面の中に入る', async ({ page }) => {
  await onTimeline(page, 30);
  await page.keyboard.press('j');
  await expect.poll(() => focusedText(page)).toContain('キーの試し 30');
  await page.keyboard.press('j');
  await expect.poll(() => focusedText(page)).toContain('キーの試し 29');
  const ring = await page.evaluate(
    () => getComputedStyle(document.activeElement!).outlineStyle !== 'none',
  );
  expect(ring).toBe(true);
  await page.keyboard.press('k');
  await expect.poll(() => focusedText(page)).toContain('キーの試し 30');
  for (let i = 0; i < 12; i += 1) await page.keyboard.press('j');
  await expect.poll(() => focusedText(page)).toContain('キーの試し 18');
  const inView = await page.evaluate(() => {
    const box = document.activeElement!.getBoundingClientRect();
    return box.top >= 0 && box.bottom <= window.innerHeight;
  });
  expect(inView).toBe(true);
  // Back up past the top of the screen: the post comes out from under the sticky header (review 2).
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('k');
  await expect.poll(() => focusedText(page)).toContain('キーの試し 24');
  const visible = await page.evaluate(() => {
    const post = document.activeElement!;
    const box = post.getBoundingClientRect();
    const header = document.querySelector('main [class*="sticky"]')!.getBoundingClientRect();
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + 4);
    return box.top >= header.bottom && post.contains(top);
  });
  expect(visible).toBe(true);
});

test('l で選んだ投稿にいいね、t でリポストのメニュー、r で返信の欄', async ({ page }) => {
  await onTimeline(page);
  await page.keyboard.press('j');
  await page.keyboard.press('l');
  const first = page.getByRole('article').first();
  await expect(first.getByRole('button', { name: 'いいね' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('t');
  await expect(page.getByRole('menuitem', { name: 'リポスト' })).toBeVisible();
  await page.keyboard.press('Escape');
  // The menu gives focus back to its button, inside the post, in the next frame.
  await expect(first.getByRole('button', { name: 'リポスト' })).toBeFocused();
  await page.keyboard.press('r');
  await expect(page).toHaveURL(/\/status\/\d+$/);
  await expect(page.getByRole('textbox', { name: '返信の本文' })).toBeFocused();
});

test('g のあと h / n / p で、ホーム / 通知 / プロフィールへ', async ({ page }) => {
  const me = await onTimeline(page);
  await page.keyboard.press('g');
  await page.keyboard.press('n');
  await expect(page).toHaveURL(/\/notifications$/);
  await page.keyboard.press('g');
  await page.keyboard.press('p');
  await expect(page).toHaveURL(new RegExp(`/${me.username}$`));
  await page.keyboard.press('g');
  await page.keyboard.press('h');
  await expect(page).toHaveURL(/\/home$/);
});

test('? でキーの一覧が出て、Esc で閉じる', async ({ page }) => {
  await onTimeline(page);
  await page.keyboard.press('?');
  const list = page.getByRole('dialog', { name: 'キーボードショートカット' });
  await expect(list).toBeVisible();
  await expect(list).toContainText('新しいポスト');
  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
});

test('/settings/display でテーマと色を選ぶとすぐ変わり、次に開いたときも最初の描画から同じ', async ({
  page,
}) => {
  await signUp(page);
  await page.goto('/settings/display');
  const html = page.locator('html');
  const saved = () =>
    page.waitForResponse((response) => response.request().headers()['next-action'] !== undefined);
  // Each choice is saved before the next: the account's saved look is put back on other screens.
  let done = saved();
  await page.getByRole('radio', { name: 'ダークブルー' }).check();
  await done;
  done = saved();
  await page.getByRole('radio', { name: 'ピンク' }).check();
  await done;
  await expect(html).toHaveAttribute('data-theme', 'dim');
  await expect(html).toHaveAttribute('data-accent', 'pink');
  // The accent colour reaches the page's own colours.
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
      ),
    )
    .toBe('#f91880');

  // A fresh load: the html carries the choice before anything is drawn.
  const seen: string[] = [];
  await page.exposeFunction('seeTheme', (theme: string) => seen.push(theme));
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.body) {
        (window as unknown as { seeTheme: (t: string) => void }).seeTheme(
          document.documentElement.dataset.theme ?? '',
        );
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto('/home');
  await expect(html).toHaveAttribute('data-theme', 'dim');
  expect(seen.length).toBeGreaterThan(0);
  expect(seen.filter((theme) => theme !== 'dim')).toEqual([]);
});

test('/settings は 2 ペイン。/settings/account にユーザー名・メールアドレス・登録した日が出る', async ({
  page,
}) => {
  const me = await signUp(page);
  await page.goto('/settings');
  const list = page.getByRole('navigation', { name: '設定' });
  await expect(list.getByRole('link', { name: 'アカウント' })).toBeVisible();
  await expect(list.getByRole('link', { name: '表示' })).toBeVisible();
  await list.getByRole('link', { name: 'アカウント' }).click();
  await expect(page).toHaveURL(/\/settings\/account$/);
  // Both panes at 1280px.
  await expect(list).toBeVisible();
  const account = page.getByRole('region', { name: 'アカウントの情報' });
  await expect(account).toContainText(`@${me.username}`);
  await expect(account).toContainText(me.email);
  await expect(account).toContainText(/\d{4}年\d{1,2}月\d{1,2}日/);
});

test.describe('640px 未満の設定', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('一覧と中身は 1 ペインずつ', async ({ page }) => {
    await signUp(page);
    await page.goto('/settings');
    const list = page.getByRole('navigation', { name: '設定' });
    await expect(list).toBeVisible();
    await list.getByRole('link', { name: '表示' }).click();
    await expect(page).toHaveURL(/\/settings\/display$/);
    await expect(page.getByRole('radio', { name: 'ダークブルー' })).toBeVisible();
    await expect(list).toBeHidden();
  });
});
