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

// Every field a person types, long and unbroken: no screen may scroll sideways (#80, after #74).
test('人が入れる全部の欄が長くても、全部の画面が 320px で横にはみ出さない（#80）', async ({
  page,
  browser,
}) => {
  test.slow();
  const reader = await (
    await browser.newContext({ viewport: { width: 320, height: 740 } })
  ).newPage();
  const them = await signUp(reader);
  const me = await signUp(page);
  await page.goto('/settings/profile');
  await page.getByRole('textbox', { name: '名前' }).fill('W'.repeat(50));
  await page.getByRole('textbox', { name: '自己紹介' }).fill('B'.repeat(160));
  await page.getByRole('textbox', { name: '場所' }).fill('W'.repeat(30));
  await page
    .getByRole('textbox', { name: 'ウェブサイト' })
    .fill(`https://example.test/${'w'.repeat(79)}`);
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page).not.toHaveURL(/\/settings\/profile$/);
  await page.goto('/home?tab=following');
  await page
    .getByRole('textbox', { name: '投稿の本文' })
    .fill(`#${'t'.repeat(99)} ${'P'.repeat(150)}`);
  await page.getByRole('button', { name: 'ポストする' }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  // The long-named person follows someone: their notification carries the long name.
  await page.goto(`/${them.username}`);
  await page
    .getByRole('region', { name: 'プロフィール' })
    .getByRole('button', { name: 'フォロー', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'プロフィール' }).getByRole('button', { name: 'フォロー中' }),
  ).toBeVisible();
  await page.goto(`/${me.username}`);
  await page.getByRole('article').first().locator('time').click();
  await expect(page).toHaveURL(/\/status\/\d+$/);
  const status = new URL(page.url()).pathname;

  await page.setViewportSize({ width: 320, height: 740 });
  const wide: Record<string, number> = {};
  const check = async (on: typeof page, path: string) => {
    await on.goto(path);
    await expect(on.getByRole('main').or(on.getByRole('dialog')).first(), path).toBeVisible();
    const width = await on.evaluate(() => document.documentElement.scrollWidth);
    if (width > 320) wide[path] = width;
  };
  // Every route of the #31 sweep above, with this person's long data.
  for (const path of [
    '/',
    '/i/flow/login',
    '/i/flow/signup',
    '/home',
    '/home?tab=following',
    '/explore',
    `/search?q=${'P'.repeat(20)}`,
    `/search?q=${me.username}&f=user`,
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
    `/${them.username}/followers`,
    status,
  ])
    await check(page, path);
  await check(reader, '/notifications');
  await check(reader, '/explore');
  expect(wide).toEqual({});
});

// NFR-COMPAT-02: 拡大した低い画面でも、全ての操作に届く（#83）
test.describe('低い画面の左の列（#83）', () => {
  test.use({ hasTouch: false });
  for (const { width, height } of [
    { width: 640, height: 400 },
    { width: 812, height: 375 },
  ]) {
    test(`${width}×${height} でも、左の列を送ってアカウントのメニューに届く`, async ({ page }) => {
      await signUp(page);
      await page.setViewportSize({ width, height });
      await page.goto('/home');
      const menu = page.getByRole('button', { name: /のアカウントのメニュー$/ });
      await menu.scrollIntoViewIfNeeded();
      await expect(menu).toBeInViewport();
      await menu.click();
      await expect(page.getByRole('menuitem', { name: /からログアウト$/ })).toBeVisible();
    });
  }
});

// FR-AUTH-07: ログアウト（640px 未満、ui-ux.md の 2 節のヘッダーのアバターの引き出し）
test.describe('640px 未満のアカウントの引き出し（#85）', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('640px 未満でも、ヘッダーのアバターの引き出しからプロフィール・ブックマーク・設定・ログアウトへ行ける（#85）', async ({
    page,
  }) => {
    const me = await signUp(page);
    await page.goto('/home');
    const open = page.getByRole('button', { name: /のアカウントのメニュー$/ });
    for (const [name, path] of [
      ['プロフィール', `/${me.username}`],
      ['ブックマーク', '/i/bookmarks'],
      ['設定', '/settings'],
    ] as const) {
      await open.click();
      const drawer = page.getByRole('dialog', { name: 'アカウント' });
      await expect(drawer).toContainText(`@${me.username}`);
      await drawer.getByRole('link', { name }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(drawer).toHaveCount(0);
    }
    await open.click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'アカウント' })).toHaveCount(0);
    await expect(open).toBeFocused();
    // Outside the drawer closes it; inside, Tab stays inside (review 1).
    await open.click();
    await page.mouse.click(360, 400);
    await expect(page.getByRole('dialog', { name: 'アカウント' })).toHaveCount(0);
    await open.click();
    const drawer = page.getByRole('dialog', { name: 'アカウント' });
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab');
      // At the end Base UI passes through a focus guard, which sends focus back to the start.
      await expect
        .poll(() => drawer.evaluate((element) => element.contains(document.activeElement)))
        .toBe(true);
    }
    await page.keyboard.press('Escape');
    // The search screens have no PageHeader: their box keeps clear of the avatar too.
    const inter = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
      !(
        a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y
      );
    for (const path of ['/explore', '/search?q=x']) {
      await page.goto(path);
      const box = await page.getByRole('search', { name: '話題を検索' }).boundingBox();
      expect(inter((await open.boundingBox())!, box!), path).toBe(false);
    }
    await open.click();
    await page
      .getByRole('dialog', { name: 'アカウント' })
      .getByRole('button', { name: 'ログアウト' })
      .click();
    await expect(page).toHaveURL(/\/$/);
    // Signed out, a public page's header has no avatar and no room for one (review 2).
    await expect(page.getByRole('link', { name: 'アカウントを作成' })).toBeVisible();
    await page.goto(`/${me.username}`);
    const title = page.getByRole('heading', { level: 1 });
    await expect(title).toBeVisible();
    expect((await title.boundingBox())!.x).toBeLessThan(24);
  });
});

test('引き出しを開いたまま 640px より広げると閉じる（#87）', async ({ page }) => {
  await signUp(page);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/home');
  await page.getByRole('button', { name: /のアカウントのメニュー$/ }).click();
  await expect(page.getByRole('dialog', { name: 'アカウント' })).toBeVisible();
  await page.setViewportSize({ width: 900, height: 800 });
  await expect(page.getByRole('dialog', { name: 'アカウント' })).toHaveCount(0);
});

// NFR-A11Y: フォーカスが隠れない（WCAG 2.2 の 2.4.11、#86）
test.describe('狭く低い画面のフォーカス（#86）', () => {
  test.use({ hasTouch: false });

  test('狭く低い画面でも、Tab のフォーカスは固定の部品の下に隠れない（#86）', async ({ page }) => {
    const me = await signUp(page);
    await page.setViewportSize({ width: 427, height: 267 });
    await page.goto(`/${me.username}`);
    const edit = page.getByRole('link', { name: 'プロフィールを編集' });
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press('Tab');
      if (await edit.evaluate((element) => element === document.activeElement)) break;
    }
    await expect(edit).toBeFocused();
    const bar = await page.getByRole('navigation', { name: '下のタブ' }).boundingBox();
    const box = await edit.boundingBox();
    expect(box!.y + box!.height, 'above the tab bar').toBeLessThanOrEqual(bar!.y);
  });

  test('Shift+Tab で戻っても、上の見出しとタブの下に隠れない。360×300 の「いいね」も丸いボタンの下に隠れない（#86 のレビュー）', async ({
    page,
  }) => {
    const me = await signUp(page);
    await insertPosts(me.username, 12, 'フォーカスの確かめ');
    for (const { width, height, path, stuck } of [
      { width: 375, height: 400, path: '/home?tab=following', stuck: 107 },
      { width: 1280, height: 500, path: '/home?tab=following', stuck: 107 },
      { width: 375, height: 400, path: `/${me.username}`, stuck: 53 },
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto(path);
      await page.getByRole('article').nth(8).getByRole('button', { name: 'いいね' }).focus();
      for (let i = 0; i < 20; i += 1) {
        await page.keyboard.press('Shift+Tab');
        // WCAG 2.4.11: the focused control is not entirely hidden under the sticky block.
        const bottom = await page.evaluate(() =>
          document.activeElement!.closest('main article')
            ? document.activeElement!.getBoundingClientRect().bottom
            : Infinity,
        );
        expect(bottom, `${path} at ${width}×${height}`).toBeGreaterThan(stuck);
      }
    }
    await page.setViewportSize({ width: 360, height: 300 });
    await page.goto('/home?tab=following');
    const fab = await page.getByRole('link', { name: 'ポストする' }).last().boundingBox();
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press('Tab');
      const box = await page.evaluate(() => {
        const element = document.activeElement!;
        if (!element.closest('main article')) return null;
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      });
      // Not entirely under the floating button, nor below the tab bar's top (WCAG 2.4.11).
      if (box) {
        const under =
          box.x >= fab!.x &&
          box.x + box.width <= fab!.x + fab!.width &&
          box.y >= fab!.y &&
          box.y + box.height <= fab!.y + fab!.height;
        expect(under, 'entirely under the floating button').toBe(false);
        expect(box.y, 'above the tab bar').toBeLessThan(300 - 53);
      }
    }
  });
});
