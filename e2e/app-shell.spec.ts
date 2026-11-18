import { expect, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';

// docs/architecture/ui-ux.md 2 (layout and breakpoints) and 10 (focus ring).
const leftNav = (page: Page) => page.getByRole('navigation', { name: 'メインのメニュー' });
const main = (page: Page) => page.getByRole('main');
const sidebar = (page: Page) => page.getByRole('complementary');
const tabBar = (page: Page) => page.getByRole('navigation', { name: '下のタブ' });
const width = async (page: Page, locator: ReturnType<Page['locator']>) =>
  Math.round((await locator.boundingBox())!.width);

// /home and the screens below need a signed-in user (#18): each test signs up a fresh account.
test.beforeEach(async ({ page }) => {
  await signUp(page);
});

async function open(page: Page, viewportWidth: number) {
  await page.setViewportSize({ width: viewportWidth, height: 900 });
  await page.goto('/home');
  // The shell streams in under <Suspense> once the session is read (#18).
  await expect(page.getByRole('main')).toBeVisible();
}

test('1280px で 275 / 600 / 350px の 3 カラムが出る', async ({ page }) => {
  await open(page, 1280);
  expect(await width(page, page.getByTestId('left-column'))).toBe(275);
  expect(await width(page, main(page))).toBe(600);
  expect(await width(page, sidebar(page))).toBe(350);
  await expect(leftNav(page).getByText('ホーム', { exact: true })).toBeVisible();
  await expect(tabBar(page)).toBeHidden();
});

test('1024〜1279px では、左ナビがアイコンだけ（88px）で、右サイドバーが出る', async ({ page }) => {
  await open(page, 1100);
  expect(await width(page, page.getByTestId('left-column'))).toBe(88);
  // The label stays for screen readers (it names the link, #26) but is not drawn: 1px or less.
  expect(
    (await leftNav(page).getByText('ホーム', { exact: true }).boundingBox())!.width,
  ).toBeLessThanOrEqual(1);
  await expect(leftNav(page).getByRole('link', { name: 'ホーム', exact: true })).toBeVisible();
  await expect(sidebar(page)).toBeVisible();
});

test('640〜1023px では、右サイドバーが出ず、左ナビはアイコンだけ', async ({ page }) => {
  await open(page, 800);
  await expect(sidebar(page)).toBeHidden();
  expect(await width(page, page.getByTestId('left-column'))).toBe(88);
  expect(await width(page, main(page))).toBe(600);
});

test('640px 未満では、左ナビが出ず、下のタブバーと右下の投稿ボタンが出る', async ({ page }) => {
  await open(page, 375);
  await expect(leftNav(page)).toBeHidden();
  await expect(tabBar(page)).toBeVisible();
  await expect(page.getByRole('link', { name: '投稿する' })).toBeVisible();
  expect(await width(page, main(page))).toBe(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test('ヘッダーは高さ 53px で半透明、スクロールしてもヘッダー・左ナビ・右サイドバーが上に残る', async ({
  page,
}) => {
  await open(page, 1280);
  const header = main(page).locator('header').first();
  expect(Math.round((await header.boundingBox())!.height)).toBe(53);
  expect(await header.evaluate((el) => getComputedStyle(el).backdropFilter)).toContain(
    'blur(12px)',
  );
  await main(page).evaluate((el) => {
    const filler = document.createElement('div');
    filler.style.height = '4000px';
    el.append(filler);
  });
  await page.evaluate(() => window.scrollTo({ top: 2000, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
  expect((await header.boundingBox())!.y).toBe(0);
  expect((await leftNav(page).boundingBox())!.y).toBeLessThanOrEqual(0 + 1);
  expect((await sidebar(page).boundingBox())!.y).toBeLessThanOrEqual(0 + 1);
});

test('フォーカスの輪は、キーボードで動かしたときだけ 2px のアクセント色で出る', async ({
  page,
}) => {
  await open(page, 1280);
  const home = leftNav(page).getByRole('link', { name: 'ホーム', exact: true });
  await home.click();
  expect(await home.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  expect(await focused.evaluate((el) => getComputedStyle(el).outlineWidth)).toBe('2px');
  // transition-colors also animates outline-color, so wait for the transition to finish.
  await expect
    .poll(() => focused.evaluate((el) => getComputedStyle(el).outlineColor))
    .toBe('rgb(29, 155, 240)');
});

test('表示の名前は x-modoki で、どの幅でもフッターに X Corp. とは関係が無いと出る', async ({
  page,
}) => {
  await open(page, 1280);
  await expect(page.getByRole('link', { name: 'x-modoki のホーム' })).toBeVisible();
  for (const viewportWidth of [1280, 800, 375]) {
    await open(page, viewportWidth);
    await expect(page).toHaveTitle('x-modoki');
    await expect(
      page.getByText('X Corp. とは関係の無い学習用のアプリ').filter({ visible: true }),
    ).toHaveCount(1);
  }
});

test('data-theme で背景の色が変わる（light / dim / dark）', async ({ page }) => {
  await open(page, 1280);
  const background = () =>
    page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  expect(await background()).toBe('rgb(255, 255, 255)');
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dim'));
  expect(await background()).toBe('rgb(21, 32, 43)');
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
  expect(await background()).toBe('rgb(0, 0, 0)');
});

test('/home を開くと、コンソールのエラーと失敗した通信が 0（ナビの行き先の先読みも含む）', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on(
    'response',
    (response) => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`),
  );
  for (const viewportWidth of [1280, 375]) {
    await open(page, viewportWidth);
    await page.waitForLoadState('networkidle');
  }
  expect(errors).toEqual([]);
});
