import { expect, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';

const composer = (page: Page) => page.getByRole('textbox', { name: '投稿の本文' });

async function postFromHome(page: Page, text: string) {
  await page.goto('/home?tab=following');
  await composer(page).fill(text);
  await page.getByRole('button', { name: 'ポストする' }).click();
  await expect(page.getByRole('article').first()).toContainText(text);
}

// FR-CONV-01: 返信
// FR-CONV-03: スレッドの表示
// FR-VIEW-01: 投稿の詳細
test('カードを押すと詳細が開き、返信すると返信の一覧に出て、返信先が出る', async ({ page }) => {
  const me = await signUp(page);
  await postFromHome(page, '親の投稿');
  await page.getByRole('article').first().getByText('親の投稿').click();
  await expect(page).toHaveURL(new RegExp(`/${me.username}/status/\\d+$`));
  const main = page.getByRole('article', { name: '投稿の本体' });
  await expect(main).toContainText('親の投稿');
  await expect(main.locator('time')).toHaveText(
    /^午[前後]\d{1,2}:\d{2} · \d{4}年\d{1,2}月\d{1,2}日$/,
  );

  await page.getByRole('textbox', { name: '返信の本文' }).fill('はじめての返信');
  await page.getByRole('button', { name: '返信' }).click();
  const replies = page.getByRole('region', { name: '返信' });
  await expect(replies.getByRole('article').first()).toContainText('はじめての返信');
  await expect(replies.getByRole('article').first()).toContainText(`返信先: @${me.username}`);
  // The main post's count follows the reply without a reload (found in Chrome, #20).
  await expect(main).toContainText('1 件の返信');

  await replies.getByRole('article').first().getByText('はじめての返信').click();
  await expect(page.getByRole('article', { name: '投稿の本体' })).toContainText('はじめての返信');
  await expect(page.getByRole('article', { name: '親の投稿' })).toContainText('親の投稿');
});

test('カードの中のリンクは、詳細ではなくその行き先へ進む', async ({ page }) => {
  const me = await signUp(page);
  await postFromHome(page, '#カードの中');
  await page.getByRole('article').first().getByRole('link', { name: '#カードの中' }).click();
  await expect(page).toHaveURL(/\/search\?q=/);
  void me;
});

// FR-VIEW-02: 詳細の URL
test('URL のユーザー名が作者と違えば正しい URL へ、無い ID と数字でない ID は 404', async ({
  page,
}) => {
  const me = await signUp(page);
  await postFromHome(page, '正しい URL');
  await page.getByRole('article').first().getByText('正しい URL').click();
  await expect(page).toHaveURL(/\/status\/\d+$/);
  const id = page.url().split('/').pop();
  await page.goto(`/someone_else/status/${id}`);
  await expect(page).toHaveURL(new RegExp(`/${me.username}/status/${id}$`));
  // The detail streams under <Suspense>, so the 404 is the not-found screen (the HTTP status is
  // already sent); the acceptance criterion asks for the screen.
  for (const bad of ['999999999999999', 'abc']) {
    await page.goto(`/${me.username}/status/${bad}`);
    // The app's own screen, not Next.js's default, which paints the body black in a dark OS and
    // hides the light-theme sidebar (found in Chrome, #20).
    await expect(page.getByRole('heading', { name: 'このページは存在しません。' })).toBeVisible();
    await expect(
      page.getByRole('main').getByRole('link', { name: '検索', exact: true }),
    ).toHaveAttribute('href', '/explore');
  }
});

// FR-POST-08: 削除
test('自分の投稿は、確認のダイアログのあとで削除でき、一覧から消える', async ({ page }) => {
  await signUp(page);
  await postFromHome(page, '消す投稿');
  const card = page.getByRole('article').first();
  await card.getByRole('button', { name: 'もっと見る' }).click();
  await page.getByRole('menuitem', { name: '削除' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('ポストを削除しますか？');
  await dialog.getByRole('button', { name: '削除' }).click();
  await expect(page.getByText('消す投稿')).toHaveCount(0);
});

test('返信を消すと、本体の返信の数がその場で減る', async ({ page }) => {
  await signUp(page);
  await postFromHome(page, '数を見る親');
  await page.getByRole('article').first().getByText('数を見る親').click();
  const main = page.getByRole('article', { name: '投稿の本体' });
  await page.getByRole('textbox', { name: '返信の本文' }).fill('消す返信');
  await page.getByRole('button', { name: '返信' }).click();
  await expect(main).toContainText('1 件の返信');
  const reply = page.getByRole('region', { name: '返信' }).getByRole('article').first();
  await reply.getByRole('button', { name: 'もっと見る' }).click();
  await page.getByRole('menuitem', { name: '削除' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '削除' }).click();
  await expect(page.getByRole('region', { name: '返信' })).toContainText('まだ返信がありません');
  await expect(main).toContainText('0 件の返信');
});

// FR-POST-08: 投稿の削除
test('詳細の画面で削除したあと「戻る」でも、消した投稿の詳細は出ない（#68）', async ({ page }) => {
  await signUp(page);
  await postFromHome(page, '戻って見える投稿');
  await page.getByRole('article').first().locator('time').click();
  await expect(page).toHaveURL(/\/status\/\d+$/);
  const main = page.getByRole('article', { name: '投稿の本体' });
  await main.getByRole('button', { name: 'もっと見る' }).click();
  await page.getByRole('menuitem', { name: '削除' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '削除' }).click();
  await expect(page).toHaveURL(/\/home/);
  await page.goBack();
  await expect(page.getByRole('article', { name: '投稿の本体' })).toHaveCount(0);
  // Visible only: Next.js keeps the page it left hidden in the DOM (Activity).
  await expect(page.getByText('戻って見える投稿').filter({ visible: true })).toHaveCount(0);
});

// FR-VIEW-01: 投稿の詳細
test('詳細で返信して戻ると、ホームのカードの返信と表示の数が増えている（#69）', async ({
  page,
}) => {
  await signUp(page);
  await postFromHome(page, '数が戻る投稿');
  await page.getByRole('article').first().locator('time').click();
  await expect(page).toHaveURL(/\/status\/\d+$/);
  await page.getByRole('textbox', { name: '返信の本文' }).fill('返信した');
  await page.getByRole('button', { name: '返信', exact: true }).click();
  await expect(page.getByText('1 件の返信')).toBeVisible();
  await page.goBack();
  const card = page.getByRole('article').filter({ hasText: '数が戻る投稿' });
  // Each count is read as 「返信 1」 / 「表示 1」 (the words are for screen readers).
  await expect(card.getByText('返信 1', { exact: true })).toHaveCount(1);
  await expect(card.getByText('表示 1', { exact: true })).toHaveCount(1);
});

test('返信を詳細で消して戻ると、親の詳細と一覧のカードの返信の数が減っている（#78）', async ({
  page,
}) => {
  await signUp(page);
  await postFromHome(page, '返信を消される親');
  await page.getByRole('article').first().getByText('返信を消される親').click();
  await expect(page).toHaveURL(/\/status\//);
  await page.getByRole('textbox', { name: '返信の本文' }).fill('あとで消す返信');
  await page.getByRole('button', { name: '返信', exact: true }).click();
  await expect(page.getByText('1 件の返信')).toBeVisible();
  await page
    .getByRole('article')
    .filter({ hasText: 'あとで消す返信' })
    .getByText('あとで消す返信')
    .click();
  const main = page.getByRole('article', { name: '投稿の本体' });
  await expect(main).toContainText('あとで消す返信');
  await main.getByRole('button', { name: 'もっと見る' }).click();
  await page.getByRole('menuitem', { name: '削除' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '削除' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goBack();
  await expect(page.getByRole('article', { name: '投稿の本体' })).toContainText('返信を消される親');
  await expect(page.getByText('0 件の返信').filter({ visible: true })).toBeVisible();
  await page.goBack();
  const card = page.getByRole('article').filter({ hasText: '返信を消される親' }).first();
  await expect(card.getByText('返信 0', { exact: true })).toHaveCount(1);
});
