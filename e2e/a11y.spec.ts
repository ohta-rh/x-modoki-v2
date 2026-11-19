import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';
import { insertPosts, setTheme } from './support/db';
import { pngFile } from './support/images';

// WCAG 2.2 A and AA (NFR-A11Y-01), and axe's best practices: one main, a heading one, landmarks
// told apart, headings in order (NFR-A11Y-08).
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** Every violation on the page as it is now: rule, impact and the first few targets. */
async function violations(page: Page) {
  const { violations: found } = await new AxeBuilder({ page })
    .withTags(WCAG)
    .setLegacyMode(true)
    .analyze();
  return found.map(({ id, impact, nodes }) => ({
    id,
    impact,
    // The element, and for a colour contrast the two colours and their ratio.
    targets: nodes.slice(0, 3).map((node) => {
      const data = node.any[0]?.data as {
        fgColor?: string;
        bgColor?: string;
        contrastRatio?: number;
      };
      return [node.target.join(' '), data?.fgColor, data?.bgColor, data?.contrastRatio]
        .filter(Boolean)
        .join(' ');
    }),
  }));
}

// NFR-A11Y-01: WCAG 2.2 の AA
// NFR-A11Y-06: 名前の無いボタンが無く、画像の全てに alt（axe の button-name・image-alt）
// NFR-A11Y-08: nav・main・aside と、順の飛ばない見出し（axe の best-practice）
for (const theme of ['light', 'dim', 'dark'] as const) {
  test(`${theme}: ルーティングの全部の画面に、WCAG 2.2 の A と AA の違反が無い（#31）`, async ({
    page,
    context,
  }) => {
    test.slow();
    // Signed out: the entrance and the two forms, in the theme the cookie names (ADR-0051).
    await page.goto('/');
    await context.addCookies([{ name: 'theme', value: theme, url: page.url() }]);
    const found: Record<string, unknown> = {};
    for (const path of ['/', '/i/flow/login', '/i/flow/signup']) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      // The streamed content is in, not still hidden.
      await expect(page.getByRole('main'), path).toBeVisible();
      found[path] = await violations(page);
    }

    const me = await signUp(page);
    await setTheme(me.username, theme);
    await insertPosts(me.username, 3, 'アクセシビリティの確かめ');
    // A post with an image, for the photo viewer.
    await page.goto('/home?tab=following');
    await page.getByLabel('画像を追加').setInputFiles(await pngFile(page, 300, 200));
    await expect(page.getByRole('group', { name: '添付した画像' }).getByRole('img')).toHaveCount(1);
    await page.getByRole('textbox', { name: '投稿の本文' }).fill('画像つきの確かめ');
    await page.getByRole('button', { name: 'ポストする' }).click();
    const card = page.getByRole('article').filter({ hasText: '画像つきの確かめ' });
    await expect(card.locator('img')).toHaveCount(1);
    await card.getByText('画像つきの確かめ').click();
    await expect(page).toHaveURL(/\/status\/\d+$/);
    const status = new URL(page.url()).pathname;
    // Liked and reposted, so their pink and green counts are checked too.
    const main = page.getByRole('article', { name: '投稿の本体' });
    const liked = page.waitForResponse(
      (response) => response.request().headers()['next-action'] !== undefined,
    );
    await main.getByRole('button', { name: /^いいね/ }).click();
    // The detail reads itself again after the like; let that land before leaving.
    await (await liked).finished();
    await page.waitForLoadState('networkidle');
    await expect(main.getByRole('button', { name: /^いいね/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.goto('/home?tab=following');
    const listed = page.getByRole('article').filter({ hasText: '画像つきの確かめ' }).first();
    await listed.getByRole('button', { name: /^リポスト/ }).click();
    await page.getByRole('menuitem', { name: 'リポスト' }).click();
    await expect(listed.getByRole('button', { name: /^リポスト/ })).toHaveClass(/text-repost/);

    for (const path of [
      '/home?tab=following',
      '/home',
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
      `${status}/photo/1`,
    ]) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      // The photo viewer is a modal over the post: only the dialog is in the accessibility tree.
      await expect(page.getByRole('main').or(page.getByRole('dialog')).first(), path).toBeVisible();
      // The page's own content streams in after the shell (Suspense): its h1 is there once it is
      // revealed, not while it still waits in a hidden boundary (seen on CI's slower machine).
      await expect
        .poll(
          () =>
            page.evaluate(() =>
              [...document.querySelectorAll('h1')].some((h1) => !h1.closest('[hidden]')),
            ),
          path,
        )
        .toBe(true);
      found[path] = await test.step(path, () => violations(page));
    }
    expect(
      Object.fromEntries(Object.entries(found).filter(([, list]) => (list as []).length > 0)),
    ).toEqual({});
  });
}
