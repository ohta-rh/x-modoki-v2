import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { capture, judge, parseArgs, run } from './lib/chrome-evidence.mjs';

const dir = mkdtempSync(join(tmpdir(), 'chrome-evidence-'));
const page = (name, html) => {
  const file = join(dir, `${name}.html`);
  writeFileSync(
    file,
    `<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width"></head><body>${html}</body></html>`,
  );
  return pathToFileURL(file).href;
};
const clean = page('clean', '<h1>ok</h1>');
const wide = page('wide', '<div style="width:2000px">wide</div>');
const noisy = page(
  'noisy',
  '<script>console.log("fine"); console.error("boom"); console.warn("careful")</script>',
);
const throws = page(
  'throws',
  '<script>setTimeout(() => { throw new Error("uncaught"); })</script>',
);
const broken = page('broken', `<img src="${pathToFileURL(join(dir, 'missing.png')).href}">`);

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('parseArgs', () => {
  it('既定は 1280・768・375 の幅、高さ 900', () => {
    expect(parseArgs(['--out', 'o', 'a=http://x'])).toEqual({
      widths: [1280, 768, 375],
      height: 900,
      out: 'o',
      targets: [{ name: 'a', url: 'http://x' }],
    });
  });

  it('幅と高さを指定でき、URL の中の = を保つ', () => {
    expect(
      parseArgs(['--widths', '400,800', '--height', '600', '--out', 'o', 'a=http://x/?q=1']),
    ).toMatchObject({
      widths: [400, 800],
      height: 600,
      targets: [{ name: 'a', url: 'http://x/?q=1' }],
    });
  });

  it('--storage-state でログインした状態のファイルを受け取る', () => {
    expect(parseArgs(['--storage-state', 's.json', '--out', 'o', 'a=http://x']).storageState).toBe(
      's.json',
    );
    expect(parseArgs(['--out', 'o', 'a=http://x']).storageState).toBeUndefined();
  });

  it('知らない引数を拒む', () => {
    expect(() => parseArgs(['--nope'])).toThrow('unknown argument: --nope');
  });

  it('--out と対象が要る', () => {
    expect(() => parseArgs(['a=http://x'])).toThrow(/usage/);
    expect(() => parseArgs(['--out', 'o'])).toThrow(/usage/);
  });
});

describe('judge', () => {
  const good = {
    loaded: true,
    innerWidth: 375,
    scrollsSideways: false,
    consoleErrors: [],
    failedRequests: [],
  };
  it('読み込めて、幅が合い、横に流れず、エラーが無ければ失敗ではない', () => {
    expect(judge(good, 375)).toBe(false);
  });
  it.each([
    ['読み込めていない', { loaded: false }],
    ['幅が違う', { innerWidth: 500 }],
    ['横にスクロールする', { scrollsSideways: true }],
    ['コンソールのエラー', { consoleErrors: ['x'] }],
    ['失敗した通信', { failedRequests: ['404 x'] }],
  ])('%s なら失敗', (_name, change) => {
    expect(judge({ ...good, ...change }, 375)).toBe(true);
  });
});

describe('capture（本物の Chromium）', () => {
  let browser;
  beforeAll(async () => {
    browser = await chromium.launch();
  }, 60_000);
  afterAll(async () => {
    await browser?.close();
  });

  it('storageState を渡すと、その cookie を付けて開く（ログインが要る画面のため）', async () => {
    const seen = [];
    const server = createServer((request, response) => {
      seen.push(request.headers.cookie ?? '');
      response.setHeader('content-type', 'text/html');
      response.end('<h1>ok</h1>');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    const state = join(dir, 'state.json');
    writeFileSync(
      state,
      JSON.stringify({
        cookies: [
          {
            name: 'session',
            value: 'abc',
            domain: '127.0.0.1',
            path: '/',
            expires: -1,
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
          },
        ],
        origins: [],
      }),
    );
    try {
      const out = mkdtempSync(join(dir, 'out-'));
      const record = await capture(
        browser,
        { name: 'auth', url: `http://127.0.0.1:${port}/` },
        375,
        600,
        out,
        state,
      );
      expect(record.loaded).toBe(true);
      expect(seen[0]).toBe('session=abc');
    } finally {
      server.close();
    }
  });

  it('指定の幅で撮り、幅・横のスクロール・コンソール・通信を記録する', async () => {
    const out = mkdtempSync(join(dir, 'out-'));
    const record = await capture(browser, { name: 'clean', url: clean }, 375, 600, out);
    expect(record).toMatchObject({
      name: 'clean',
      requestedWidth: 375,
      innerWidth: 375,
      scrollsSideways: false,
      loaded: true,
      consoleErrors: [],
      consoleWarnings: [],
      failedRequests: [],
    });
    expect(existsSync(join(out, 'clean-375.jpg'))).toBe(true);
    expect(readFileSync(join(out, 'clean-375.jpg')).subarray(0, 2)).toEqual(
      Buffer.from([0xff, 0xd8]),
    );
  });

  it('横にはみ出すページを見つける', async () => {
    const record = await capture(
      browser,
      { name: 'wide', url: wide },
      375,
      600,
      mkdtempSync(join(dir, 'out-')),
    );
    expect(record.scrollsSideways).toBe(true);
  });

  it('コンソールのエラーと警告を集める', async () => {
    const record = await capture(
      browser,
      { name: 'noisy', url: noisy },
      375,
      600,
      mkdtempSync(join(dir, 'out-')),
    );
    expect(record.consoleErrors).toEqual(['boom']);
    expect(record.consoleWarnings).toEqual(['careful']);
  });

  it('捕まえていない例外をコンソールのエラーとして集める', async () => {
    const record = await capture(
      browser,
      { name: 'throws', url: throws },
      375,
      600,
      mkdtempSync(join(dir, 'out-')),
    );
    expect(record.consoleErrors).toEqual(['uncaught']);
  });

  it('開けないページは、読み込めなかったとして記録する', async () => {
    const record = await capture(
      browser,
      { name: 'down', url: 'http://127.0.0.1:9/' },
      375,
      600,
      mkdtempSync(join(dir, 'out-')),
    );
    expect(record.loaded).toBe(false);
  });

  it('失敗した通信を集める', async () => {
    const record = await capture(
      browser,
      { name: 'broken', url: broken },
      375,
      600,
      mkdtempSync(join(dir, 'out-')),
    );
    expect(record.failedRequests.length).toBe(1);
  });

  it('HTTP の 4xx と 5xx を失敗として集める', async () => {
    const context = await browser.newContext();
    await context.route('**/*', (route) =>
      route.fulfill({ status: 404, body: 'gone', contentType: 'text/html' }),
    );
    const fakeBrowser = { newContext: async () => context };
    const record = await capture(
      fakeBrowser,
      { name: 'gone', url: 'http://example.test/' },
      375,
      600,
      mkdtempSync(join(dir, 'out-')),
    );
    expect(record.failedRequests).toEqual(['404 http://example.test/']);
  });
});

describe('run', () => {
  const log = () => ({ log: vi.fn(), error: vi.fn() });

  it('全部よければ 0、1 行ずつ JSON を書く', async () => {
    const out = mkdtempSync(join(dir, 'run-'));
    const l = log();
    const code = await run(['--widths', '375', '--height', '600', '--out', out, `clean=${clean}`], {
      log: l,
      launch: () => chromium.launch(),
    });
    expect(code).toBe(0);
    expect(JSON.parse(l.log.mock.calls[0][0])).toMatchObject({ name: 'clean', innerWidth: 375 });
  }, 60_000);

  it('1 つでも悪ければ 1', async () => {
    const out = mkdtempSync(join(dir, 'run-'));
    const code = await run(['--widths', '375', '--out', out, `wide=${wide}`], {
      log: log(),
      launch: () => chromium.launch(),
    });
    expect(code).toBe(1);
  }, 60_000);

  it('引数が悪ければ、使い方を書いて 2', async () => {
    const l = log();
    expect(await run([], { log: l })).toBe(2);
    expect(l.error.mock.calls[0][0]).toMatch(/usage/);
  });

  it('既定の起動は、CI では同梱の Chromium、手元では Google Chrome を使う', async () => {
    const launch = vi
      .spyOn(chromium, 'launch')
      .mockResolvedValue({ newContext: vi.fn(), close: vi.fn() });
    const out = mkdtempSync(join(dir, 'run-'));
    vi.stubEnv('CI', 'true');
    await run(['--widths', '375', '--out', out, 'x=http://x'], { log: log() }).catch(() => {});
    vi.stubEnv('CI', '');
    await run(['--widths', '375', '--out', out, 'x=http://x'], { log: log() }).catch(() => {});
    expect(launch.mock.calls.map((c) => c[0])).toEqual([{}, { channel: 'chrome' }]);
  });
});

describe('scripts/chrome-evidence.mjs', () => {
  it('コマンドとして動かすと、終了コードを設定する', async () => {
    const argv = process.argv;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.argv = ['node', 'chrome-evidence.mjs'];
    try {
      await import('./chrome-evidence.mjs');
      expect(process.exitCode).toBe(2);
    } finally {
      process.argv = argv;
      process.exitCode = undefined;
    }
  });
});
