import { expect, type Page, test } from '@playwright/test';
import { signUp } from './support/auth';

/**
 * The longest animation and transition, in seconds, of the open composer and the nav links, and
 * how a spinner (`animate-spin`, an infinite rotation) would run.
 */
async function motion(page: Page) {
  await page.getByRole('link', { name: '投稿する' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return page.evaluate(() => {
    const seconds = (value: string) =>
      Math.max(...value.split(',').map((part) => parseFloat(part)));
    const dialogStyle = getComputedStyle(document.querySelector('[role="dialog"]')!);
    const linkStyle = getComputedStyle(document.querySelector('nav a')!);
    // The spinner's own class on a probe: a real spinner shows only while a page loads.
    const probe = document.createElement('div');
    probe.className = 'animate-spin';
    document.body.append(probe);
    const spin = getComputedStyle(probe);
    const spinner = {
      duration: seconds(spin.animationDuration),
      count: spin.animationIterationCount,
    };
    probe.remove();
    return {
      spinner,
      animation: seconds(dialogStyle.animationDuration),
      transition: seconds(linkStyle.transitionDuration),
    };
  });
}

// NFR-A11Y-07: 動きを減らす設定のとき、アニメーションをしない
test.describe('動きを減らす設定（#63）', () => {
  test.use({ reducedMotion: 'reduce' });

  test('動きを減らす設定のとき、モーダルの出入りもリンクの色の遷移も動かない', async ({ page }) => {
    await signUp(page);
    const { animation, transition, spinner } = await motion(page);
    expect(animation).toBeLessThan(0.001);
    expect(transition).toBeLessThan(0.001);
    // The spinner turns once, at once, and stops (review 1).
    expect(spinner.duration).toBeLessThan(0.001);
    expect(spinner.count).toBe('1');
  });
});

test('設定が無いときは、モーダルとリンクは今まで通り動く（#63）', async ({ page }) => {
  await signUp(page);
  const { animation, transition, spinner } = await motion(page);
  expect(animation).toBeGreaterThan(0.05);
  expect(transition).toBeGreaterThan(0.05);
  expect(spinner).toEqual({ duration: 1, count: 'infinite' });
});
