import { expect, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';

const composer = (page: Page) => page.getByRole('dialog', { name: 'ポストする' });
const box = (page: Page) => composer(page).getByRole('textbox', { name: '投稿の本文' });

// FR-POST-10: モーダルの入力欄
// FR-OPS-08: フォーカスの扱い
// NFR-A11Y-04: 全てのモーダルが、開くとフォーカスを中に閉じ込め、`Esc` で閉じ、閉じると開いた要素へフォーカスを戻す
test('投稿ボタンで /compose/post がモーダルで開く。フォーカスは中に閉じ、閉じると元のボタンへ戻る', async ({
  page,
}) => {
  await signUp(page);
  await page.goto('/explore');
  const button = page.getByRole('navigation').getByRole('link', { name: '投稿する' });
  await button.click();
  await expect(page).toHaveURL(/\/compose\/post$/);
  await expect(box(page)).toBeFocused();
  // The screen it opened over is still there, behind the modal.
  await expect(
    page.getByRole('region', { name: 'いまどうしてる？', includeHidden: true }).first(),
  ).toBeAttached();
  // Tab stays inside the modal: focus that reaches the end is moved back to the start in the next
  // frame, so wait for it to settle each time.
  const focusInside = () =>
    composer(page).evaluate((dialog) => dialog.contains(document.activeElement));
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Tab');
    await expect.poll(focusInside).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(composer(page)).toBeHidden();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(button).toBeFocused();
});

test('375px では右下の投稿ボタンからも開く', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await signUp(page);
  await page.getByRole('link', { name: '投稿する' }).click();
  await expect(page).toHaveURL(/\/compose\/post$/);
  await expect(box(page)).toBeVisible();
});

test('/compose/post を直接開くとページとして出る', async ({ page }) => {
  await signUp(page);
  await page.goto('/compose/post');
  await expect(composer(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'ポストする' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '投稿の本文' })).toBeVisible();
});

// FR-POST-11: 下書きの保存
test('中身があるときに閉じると「破棄 / 保存」を聞き、保存した下書きは次に開いたときに戻る', async ({
  page,
}) => {
  await signUp(page);
  const open = async () => {
    await page.getByRole('navigation').getByRole('link', { name: '投稿する' }).click();
    await expect(box(page)).toBeVisible();
  };
  await open();
  await box(page).fill('書きかけの下書き');
  await page.keyboard.press('Escape');
  const ask = page.getByRole('alertdialog', { name: 'ポストを保存しますか？' });
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: '保存' }).click();
  await expect(composer(page)).toBeHidden();
  await expect(page).toHaveURL(/\/home$/);

  await open();
  await expect(box(page)).toHaveValue('書きかけの下書き');
  await page.keyboard.press('Escape');
  await page.getByRole('alertdialog').getByRole('button', { name: '破棄' }).click();
  await expect(composer(page)).toBeHidden();

  await open();
  await expect(box(page)).toHaveValue('');
  // Empty: closing asks nothing.
  await page.keyboard.press('Escape');
  await expect(composer(page)).toBeHidden();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

// FR-POST-12: 送ったあとの知らせ
test('送ったあと、下の中央に「ポストを送信しました」と「表示」のリンクが出て、その投稿へ進める', async ({
  page,
}) => {
  const me = await signUp(page);
  await page.getByRole('navigation').getByRole('link', { name: '投稿する' }).click();
  await box(page).fill('モーダルから投稿');
  await composer(page).getByRole('button', { name: 'ポストする' }).click();
  await expect(composer(page)).toBeHidden();
  const toast = page.getByText('ポストを送信しました');
  await expect(toast).toBeVisible();
  // Bottom centre of the viewport.
  const viewport = page.viewportSize()!;
  const rect = (await toast.boundingBox())!;
  expect(Math.abs(rect.x + rect.width / 2 - viewport.width / 2)).toBeLessThan(200);
  expect(rect.y).toBeGreaterThan(viewport.height / 2);
  await page.getByRole('link', { name: '表示', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${me.username}/status/\\d+$`));
  await expect(page.getByRole('article', { name: '投稿の本体' })).toContainText('モーダルから投稿');
});
