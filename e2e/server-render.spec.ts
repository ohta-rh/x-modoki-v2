import { expect, test } from '@playwright/test';
import { signUp } from './support/auth';
import { insertPosts } from './support/db';

test.describe('JavaScript を読み込み終える前', () => {
  // NFR-COMPAT-03: JavaScript を読み込み終える前でも、最初の描画で投稿の本文が読める
  test('アプリの JavaScript が届かなくても、最初の描画で投稿の本文が読める（サーバーで描く、#60）', async ({
    browser,
  }) => {
    const setup = await (await browser.newContext()).newPage();
    const me = await signUp(setup);
    // Taller than the 120px a row is guessed at before it is measured.
    await insertPosts(
      me.username,
      3,
      '長い投稿\n2 行目\n3 行目\n4 行目\n5 行目\n6 行目\n7 行目\n8 行目',
    );
    await insertPosts(me.username, 1, 'スクリプト無しで読める投稿');
    // Below 1024px the site footer follows the list inside main.
    const page = await (
      await browser.newContext({ viewport: { width: 768, height: 900 } })
    ).newPage();
    // The app's bundles never arrive; only the HTML (with its small inline scripts) does.
    await page.route('**/_next/static/**/*.js', (route) => route.abort());
    await page.goto(`/${me.username}`);
    const posts = page.getByRole('article');
    await expect(posts.first()).toBeVisible();
    await expect(posts.first()).toContainText('スクリプト無しで読める投稿 1');
    await expect(posts).toHaveCount(4);
    // Unmeasured rows stack; none covers the next one.
    const boxes = await posts.evaluateAll((all) =>
      all.map((post) => post.getBoundingClientRect()).map(({ top, bottom }) => ({ top, bottom })),
    );
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 1);
    }
    // Nor does the list spill over what comes after it.
    const footer = page.getByRole('main').getByText('X Corp. とは関係の無い学習用のアプリ');
    expect((await footer.boundingBox())!.y).toBeGreaterThanOrEqual(boxes.at(-1)!.bottom - 1);
  });

  test('スクリプトが動く前にスクロールした位置は、スクリプトが動いたあとも変わらない（#60）', async ({
    page,
  }) => {
    const me = await signUp(page);
    await insertPosts(me.username, 20, '先に読む投稿');
    await page.setViewportSize({ width: 1280, height: 600 });
    // A hydration that does not match the server's HTML is reported as an error (review 1).
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    // The app's bundles are held back until the page has been scrolled while it is still only HTML.
    let release!: () => void;
    const scrolled = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/_next/static/**/*.js', async (route) => {
      await scrolled;
      await route.continue();
    });
    await page.goto('/home?tab=following', { waitUntil: 'commit' });
    await expect(page.getByRole('article').first()).toBeVisible();
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(400);
    release();
    // React has taken over the list (its fiber is on the row), and the rows have been measured.
    await page.waitForFunction(() =>
      Object.keys(document.querySelector('[data-index]')!).some((key) =>
        key.startsWith('__reactFiber'),
      ),
    );
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    expect(await page.evaluate(() => window.scrollY)).toBe(400);
    expect(errors).toEqual([]);
  });
});
