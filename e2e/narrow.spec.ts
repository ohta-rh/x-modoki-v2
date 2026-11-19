import { expect, test } from '@playwright/test';
import { signUp } from './support/auth';
import { insertPosts } from './support/db';

test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

// NFR-COMPAT-02: 画面の幅 360px から、横にスクロールせずに全ての機能を使える
test('幅 360px で、ルーティングの全部の画面が横にはみ出さない（#31）', async ({ page }) => {
  test.slow();
  const wide: Record<string, number> = {};
  const check = async (path: string) => {
    await page.goto(path);
    await expect(page.getByRole('main').or(page.getByRole('dialog')).first(), path).toBeVisible();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    if (width > 360) wide[path] = width;
  };
  for (const path of ['/', '/i/flow/login', '/i/flow/signup']) await check(path);

  const me = await signUp(page);
  await insertPosts(
    me.username,
    3,
    '狭い画面の確かめ https://example.com/a-very-long-path-for-the-narrow-screen',
  );
  await page.goto(`/${me.username}`);
  // The time, not the text: the middle of the text is the link in it.
  await page.getByRole('article').first().locator('time').click();
  await expect(page).toHaveURL(/\/status\/\d+$/);
  const status = new URL(page.url()).pathname;
  for (const path of [
    '/home',
    '/home?tab=following',
    '/explore',
    '/search?q=確かめ',
    '/search?q=確かめ&f=user',
    '/notifications',
    '/notifications/mentions',
    '/i/bookmarks',
    '/compose/post',
    '/settings',
    '/settings/account',
    '/settings/display',
    '/settings/profile',
    `/${me.username}`,
    `/${me.username}/with_replies`,
    `/${me.username}/media`,
    `/${me.username}/likes`,
    `/${me.username}/following`,
    `/${me.username}/followers`,
    status,
  ])
    await check(path);
  expect(wide).toEqual({});
});

// NFR-COMPAT-02: 狭い画面でも、全ての操作が押せる（#65）
test.describe('浮かぶ投稿ボタンと、画面の下の操作（#65）', () => {
  for (const { width, height, path, name } of [
    { width: 375, height: 667, path: '/settings/profile', name: '保存' },
    { width: 320, height: 568, path: '/settings/profile', name: '保存' },
    { width: 320, height: 300, path: '/compose/post', name: 'ポストする' },
  ]) {
    test(`${width}×${height} の ${path} では、${name} が押せ、浮かぶ投稿ボタンは出ない`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await signUp(page);
      await page.goto(path);
      // ポストする is enabled only with a body: give it one, so the press tests the overlap.
      if (path === '/compose/post') {
        await page.getByRole('textbox', { name: '投稿の本文' }).fill('狭い画面から');
      }
      const target = page.getByRole('main').getByRole('button', { name, exact: true });
      await target.scrollIntoViewIfNeeded();
      // A click lands on the button itself, not on something drawn over it.
      await target.click({ trial: true, timeout: 3000 });
      await expect(page.getByRole('link', { name: 'ポストする', exact: true })).toHaveCount(0);
    });
  }

  test('浮かぶ投稿ボタンの出る画面では、いちばん下の中身をボタンより上まで送れる', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const me = await signUp(page);
    await insertPosts(me.username, 8, '下まで送る');
    await page.goto('/home?tab=following');
    await expect(page.getByRole('article').first()).toBeVisible();
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
    );
    const fab = await page.getByRole('link', { name: 'ポストする', exact: true }).boundingBox();
    const footer = await page
      .getByRole('main')
      .getByText('X Corp. とは関係の無い学習用のアプリ')
      .boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(fab!.y);
  });
});

test.describe('人が入れた長い文字と、画面より高いダイアログ（#34 の 2 巡目）', () => {
  test.use({ hasTouch: false });

  const LONG = {
    name: 'N'.repeat(50),
    bio: `https://example.test/${'a'.repeat(139)}`,
    website: `https://example.test/${'b'.repeat(79)}`,
  };
  const sideways = (page: import('@playwright/test').Page) =>
    page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

  test('長い名前・自己紹介・URL でも、プロフィールと一覧とホバーカードは横にはみ出さない（#74）', async ({
    page,
  }) => {
    test.slow();
    // Someone for the long-named person to follow, so the long row shows in a follower list.
    const them = await signUp(page);
    await page.context().clearCookies();
    const me = await signUp(page);
    await page.goto('/settings/profile');
    await page.getByRole('textbox', { name: '名前' }).fill(LONG.name);
    await page.getByRole('textbox', { name: '自己紹介' }).fill(LONG.bio);
    await page.getByRole('textbox', { name: 'ウェブサイト' }).fill(LONG.website);
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page).not.toHaveURL(/\/settings\/profile$/);
    await page.goto(`/${them.username}`);
    await page
      .getByRole('region', { name: 'プロフィール' })
      .getByRole('button', { name: 'フォロー', exact: true })
      .click();
    await expect(
      page
        .getByRole('region', { name: 'プロフィール' })
        .getByRole('button', { name: 'フォロー中' }),
    ).toBeVisible();
    await page.goto('/home?tab=following');
    await page.getByRole('textbox', { name: '投稿の本文' }).fill('長い名前の人の投稿');
    await page.getByRole('button', { name: 'ポストする' }).click();
    await expect(page.getByRole('article').first()).toContainText('長い名前の人の投稿');
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 740 });
      for (const path of [
        `/${me.username}`,
        `/search?q=${me.username}&f=user`,
        `/${them.username}/followers`,
      ]) {
        await page.goto(path);
        await expect(page.getByText(LONG.bio).first()).toBeVisible();
        expect(await sideways(page), `${path} at ${width}`).toBe(0);
      }
      // The count beside the long name in the header stays on one line.
      await page.goto(`/${me.username}`);
      const count = page
        .locator('header')
        .filter({ hasText: LONG.name })
        .getByText(/件のポスト$/);
      await expect(count).toBeVisible();
      expect((await count.boundingBox())!.height, `header count at ${width}`).toBeLessThan(24);
      await page.goto('/home?tab=following');
      await page
        .getByRole('article')
        .first()
        .getByRole('link', { name: `${LONG.name} のプロフィール` })
        .hover();
      const card = page.getByRole('dialog', { name: `${LONG.name} のプロフィールのカード` });
      await expect(card).toContainText(LONG.bio);
      const box = await card.boundingBox();
      expect(box!.x + box!.width, `hover card at ${width}`).toBeLessThanOrEqual(width);
      expect(await sideways(page), `home with the card at ${width}`).toBe(0);
      await page.mouse.move(0, 0);
    }
  });

  test('画面より高いダイアログは、上が切れず、中を送って全部のボタンに届く（#75）', async ({
    page,
  }) => {
    await signUp(page);
    await page.goto('/home?tab=following');
    await page.getByRole('textbox', { name: '投稿の本文' }).fill('ダイアログを開く投稿');
    await page.getByRole('button', { name: 'ポストする' }).click();
    const post = page.getByRole('article').first();
    await expect(post).toContainText('ダイアログを開く投稿');
    await post.getByRole('button', { name: 'もっと見る' }).click();
    await page.getByRole('menuitem', { name: '削除' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    // 1280×800 at 400%: the dialog is taller than the screen.
    await page.setViewportSize({ width: 320, height: 200 });
    await expect(dialog).toBeVisible();
    // The layout follows the resize a frame later: wait for it.
    await expect.poll(async () => (await dialog.boundingBox())!.y).toBeGreaterThanOrEqual(0);
    const box = await dialog.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(200);
    const cancel = dialog.getByRole('button', { name: 'キャンセル' });
    await cancel.scrollIntoViewIfNeeded();
    await expect(cancel).toBeInViewport();
    await cancel.click();
    await expect(dialog).toHaveCount(0);

    // The quote dialog has its own layout: the same at 320×200.
    await page.setViewportSize({ width: 320, height: 740 });
    await post.getByRole('button', { name: 'リポスト' }).click();
    await page.getByRole('menuitem', { name: '引用' }).click();
    const quote = page.getByRole('dialog', { name: '引用' });
    await expect(quote).toBeVisible();
    await page.setViewportSize({ width: 320, height: 200 });
    await expect.poll(async () => (await quote.boundingBox())!.y).toBeGreaterThanOrEqual(0);
    const send = quote.getByRole('button', { name: 'ポストする' });
    await send.scrollIntoViewIfNeeded();
    await expect(send).toBeInViewport();
    await expect(quote.getByRole('button', { name: '閉じる' })).toBeVisible();
  });
});
