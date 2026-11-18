import { expect, type Locator, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';
import { insertPosts } from './support/db';
import { pngFile } from './support/images';

/**
 * Opens a modal from `opener` with the keyboard and checks it: focus moves in and stays in through
 * Tab, Esc closes it, and focus is back on the opener. `open` presses the keys that open it.
 */
async function checkModal(page: Page, opener: Locator, open: () => Promise<void>, name: string) {
  await opener.focus();
  await open();
  const dialog = page.getByRole('dialog', { name }).or(page.getByRole('alertdialog', { name }));
  await expect(dialog).toBeVisible();
  const inside = () =>
    page.evaluate(
      (label) =>
        [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].some(
          (element) =>
            (element.getAttribute('aria-label') === label ||
              element.querySelector('h2')?.textContent === label) &&
            element.contains(document.activeElement),
        ),
      name,
    );
  await expect.poll(inside, `${name}: focus moves into the modal`).toBe(true);
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
    await expect.poll(inside, `${name}: Tab ${i + 1} stays inside`).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener, `${name}: focus returns to the opener`).toBeFocused();
}

// NFR-A11Y-04: 全てのモーダルが、フォーカスを閉じ込め、Esc で閉じ、元の要素へ戻す
test('全部のモーダルが、フォーカスを中に閉じ、Esc で閉じ、開いた要素へフォーカスを戻す（#31）', async ({
  page,
}) => {
  test.slow();
  const me = await signUp(page);
  await insertPosts(me.username, 2, 'モーダルの確かめ');
  await page.goto('/home?tab=following');
  // A post with an image, for the viewer.
  await page.getByLabel('画像を追加').setInputFiles(await pngFile(page, 300, 200));
  await expect(page.getByRole('group', { name: '添付した画像' }).getByRole('img')).toHaveCount(1);
  await page.getByRole('textbox', { name: '投稿の本文' }).fill('画像のモーダル');
  await page.getByRole('button', { name: 'ポストする' }).click();
  const withImage = page.getByRole('article').filter({ hasText: '画像のモーダル' });
  await expect(withImage.locator('img')).toHaveCount(1);
  await page.reload();

  const nav = page.getByRole('navigation', { name: 'メインのメニュー' });
  // The composer.
  await checkModal(
    page,
    nav.getByRole('link', { name: 'ポストする' }),
    () => page.keyboard.press('Enter'),
    'ポストする',
  );
  // The keyboard shortcuts, from the ? key.
  await checkModal(
    page,
    nav.getByRole('link', { name: 'ホーム', exact: true }),
    () => page.keyboard.press('Shift+Slash'),
    'キーボードショートカット',
  );
  // The photo viewer.
  await checkModal(
    page,
    page
      .getByRole('article')
      .filter({ hasText: '画像のモーダル' })
      .getByRole('link')
      .filter({
        has: page.locator('img'),
      }),
    () => page.keyboard.press('Enter'),
    '画像',
  );
  // Quoting, from the repost menu.
  const first = page.getByRole('article').first();
  await checkModal(
    page,
    first.getByRole('button', { name: /^リポスト/ }),
    async () => {
      await page.keyboard.press('Enter');
      await page.getByRole('menuitem', { name: '引用' }).press('Enter');
    },
    '引用',
  );
  // Deleting a post, from its menu.
  await checkModal(
    page,
    first.getByRole('button', { name: 'もっと見る' }),
    async () => {
      await page.keyboard.press('Enter');
      await page.getByRole('menuitem', { name: '削除' }).press('Enter');
    },
    'ポストを削除しますか？',
  );
  // Editing the profile.
  await page.goto(`/${me.username}`);
  await checkModal(
    page,
    page.getByRole('link', { name: 'プロフィールを編集' }),
    () => page.keyboard.press('Enter'),
    'プロフィールを編集',
  );
  // Clearing the bookmarks.
  await page.goto('/i/bookmarks');
  await checkModal(
    page,
    page.getByRole('button', { name: 'ブックマークのメニュー' }),
    async () => {
      await page.keyboard.press('Enter');
      await page.getByRole('menuitem', { name: 'ブックマークを全て削除' }).press('Enter');
    },
    'ブックマークを全て削除しますか？',
  );
});
