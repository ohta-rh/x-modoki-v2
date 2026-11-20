import { expect, test } from '@playwright/test';
import { signUp } from './support/auth';
import { insertPosts } from './support/db';

test('プロフィールの返信・メディア・いいねのタブは、それぞれの URL で開き、そのタブが選ばれる（#30）', async ({
  page,
}) => {
  const me = await signUp(page);
  await insertPosts(me.username, 1, 'タブの試し');
  const tabs = [
    ['with_replies', '返信', 'タブの試し 1'],
    ['media', 'メディア', 'まだメディアがありません'],
    ['likes', 'いいね', 'まだいいねしたポストがありません'],
  ] as const;
  for (const [path, label, seen] of tabs) {
    await page.goto(`/${me.username}/${path}`);
    await expect(page.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('main')).toContainText(seen);
  }
});
