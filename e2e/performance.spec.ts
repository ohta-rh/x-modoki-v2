import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';
import { signUp } from './support/auth';

// NFR-PERF-05: 最初に送る JavaScript（/home で gzip 200KB 以下）
test.describe('速さの予算（#32）', () => {
  test('ログインした /home が最初に送る JavaScript は、gzip で 200KB 以下', async ({ page }) => {
    await signUp(page);
    const request = page.context().request;
    const html = await (await request.get('/home')).text();
    // What a current browser runs: each script once, not the noModule polyfill only old ones load.
    const sources = new Set(
      [...html.matchAll(/<script([^>]*)>/g)]
        .filter((match) => !/\bnoModule\b/i.test(match[1]))
        .flatMap((match) => /\bsrc="([^"]+)"/.exec(match[1])?.[1] ?? []),
    );
    expect(sources.size).toBeGreaterThan(0);
    let total = 0;
    for (const source of sources) {
      const body = await (await request.get(source.replaceAll('&amp;', '&'))).body();
      total += gzipSync(body).length;
    }
    expect(Math.round(total / 1024)).toBeLessThanOrEqual(200);
  });
});
