import { expect, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';

async function postFromHome(page: Page, text: string) {
  await page.goto('/home?tab=following');
  await page.getByRole('textbox', { name: '投稿の本文' }).fill(text);
  await page.getByRole('button', { name: 'ポストする' }).click();
  await expect(page.getByRole('article').first()).toContainText(text);
}

const card = (page: Page, text: string) => page.getByRole('article').filter({ hasText: text });

// The screen changes before the server answers (optimistic); wait for the Server Action itself
// before leaving the page, or the navigation can cancel it.
const actionDone = (page: Page) =>
  page.waitForResponse((response) => response.request().headers()['next-action'] !== undefined);

// FR-REACT-01: いいね
test('いいねを押すと、すぐに数が 1 増える。もう一度押すと戻る', async ({ page }) => {
  await signUp(page);
  await postFromHome(page, 'いいねされる投稿');
  const like = card(page, 'いいねされる投稿').getByRole('button', { name: 'いいね' });
  await expect(like).toHaveAttribute('aria-pressed', 'false');
  const liked = actionDone(page);
  await like.click();
  await expect(like).toHaveAttribute('aria-pressed', 'true');
  await expect(like).toContainText('1');
  // The like pink as text on the light page: the shade with 4.5:1 against it (ADR-0054).
  await expect(like).toHaveCSS('color', 'rgb(205, 5, 98)');
  // The server kept it: a reload shows the same.
  await liked;
  await page.reload();
  await expect(like).toHaveAttribute('aria-pressed', 'true');
  await like.click();
  await expect(like).toHaveAttribute('aria-pressed', 'false');
  await expect(like).not.toContainText('1');
});

// FR-REACT-02: いいねの失敗
// FR-OPS-07: トースト
test('いいねが失敗したら元に戻り、トーストが出る', async ({ page }) => {
  await signUp(page);
  await postFromHome(page, '失敗する投稿');
  // Server Actions are POSTs to the page with a Next-Action header: fail them all.
  await page.route('**/*', (route) =>
    route.request().method() === 'POST' && route.request().headers()['next-action']
      ? route.abort()
      : route.continue(),
  );
  const like = card(page, '失敗する投稿').getByRole('button', { name: 'いいね' });
  await like.click();
  await expect(page.getByText('いいねできませんでした')).toBeVisible();
  await expect(like).toHaveAttribute('aria-pressed', 'false');
  await expect(like).not.toContainText('1');
});

// FR-REACT-05: ブックマーク
test('ブックマークすると /i/bookmarks に出て、全て削除で消える', async ({ page }) => {
  await signUp(page);
  await postFromHome(page, '取っておく投稿');
  const bookmark = card(page, '取っておく投稿').getByRole('button', { name: 'ブックマーク' });
  const saved = actionDone(page);
  await bookmark.click();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  await saved;
  await page.goto('/i/bookmarks');
  await expect(page.getByRole('heading', { level: 1, name: 'ブックマーク' })).toBeVisible();
  await expect(card(page, '取っておく投稿')).toBeVisible();
  await page.getByRole('button', { name: 'ブックマークのメニュー' }).click();
  await page.getByRole('menuitem', { name: 'ブックマークを全て削除' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '削除' }).click();
  await expect(page.getByText('まだブックマークがありません')).toBeVisible();
});

test('詳細を開くと表示の回数が数えられ、カードに出る', async ({ page }) => {
  await signUp(page);
  await postFromHome(page, '見られる投稿');
  // The detail counts its view once it has drawn: leaving before that request is sent counts
  // nothing, so wait for its answer (a slow WebKit left first, #34).
  const viewed = page.waitForResponse(
    (response) => response.url().endsWith('/view') && response.request().method() === 'POST',
  );
  await card(page, '見られる投稿').getByText('見られる投稿').click();
  await expect(page.getByRole('article', { name: '投稿の本体' })).toBeVisible();
  await viewed;
  await expect(async () => {
    await page.goto('/home?tab=following');
    await expect(card(page, '見られる投稿').getByRole('group', { name: '操作' })).toContainText(
      '表示 1',
    );
  }).toPass();
});

test.describe('動きを減らす設定', () => {
  test.use({ reducedMotion: 'reduce' });

  // FR-REACT-07: 動きを減らす設定
  // NFR-A11Y-07: OS が動きを減らす設定（`prefers-reduced-motion: reduce`）のとき、アニメーションをしない
  test('prefers-reduced-motion のとき、ハートは動かない', async ({ page }) => {
    await signUp(page);
    await postFromHome(page, '動かない投稿');
    const like = card(page, '動かない投稿').getByRole('button', { name: 'いいね' });
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(await like.locator('svg').evaluate((icon) => getComputedStyle(icon).animationName)).toBe(
      'none',
    );
  });
});

test('動きを減らさないとき、押したハートは弾む', async ({ page }) => {
  await signUp(page);
  await postFromHome(page, '弾む投稿');
  const like = card(page, '弾む投稿').getByRole('button', { name: 'いいね' });
  await like.click();
  await expect(like).toHaveAttribute('aria-pressed', 'true');
  expect(await like.locator('svg').evaluate((icon) => getComputedStyle(icon).animationName)).toBe(
    'like-pop',
  );
});
