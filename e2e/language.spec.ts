import { expect, test } from '@playwright/test';
import { signUp } from './support/auth';
import { insertPosts } from './support/db';

/** UI words that would mean a label was left in English (a username or URL never matches). */
const ENGLISH_UI =
  /\b(Home|Explore|Notifications?|Bookmarks?|Profile|Settings|Post|Reply|Repost|Like|Follow(ing|ers)?|Search|Cancel|Save|Close|Loading|Show more|More|Delete|Edit|Back|Next|Previous|Sign (in|up|out)|Log ?(in|out))\b/;

// NFR-I18N-01: 画面の文言は日本語。<html lang="ja">
test('主な画面は lang="ja" で、英語の UI の言葉を出さない（#30）', async ({ page }) => {
  const me = await signUp(page);
  await insertPosts(me.username, 2, '言語の確かめ');
  for (const path of [
    '/home?tab=following',
    '/explore',
    '/search?q=言語',
    '/notifications',
    '/i/bookmarks',
    `/${me.username}`,
    `/${me.username}/following`,
    '/settings/display',
    '/settings/account',
    '/compose/post',
  ]) {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
    await expect(page.getByRole('main')).toBeVisible();
    // Visible text and the names screen readers announce.
    const text = await page.evaluate(() =>
      [
        document.body.innerText,
        ...[...document.querySelectorAll('[aria-label],[title],[placeholder],img[alt]')].map(
          (element) =>
            ['aria-label', 'title', 'placeholder', 'alt']
              .map((name) => element.getAttribute(name) ?? '')
              .join(' '),
        ),
      ].join('\n'),
    );
    expect(text.match(ENGLISH_UI)?.[0] ?? null, path).toBeNull();
  }
});
