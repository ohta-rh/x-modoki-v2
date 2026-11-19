import { createServer } from 'node:http';
import { describe, expect, test, vi } from 'vitest';
import { BUDGET, main, measure, median, overBudget, readMetrics } from './lib/perf.mjs';

// NFR-PERF-01・NFR-PERF-02・NFR-PERF-03: LCP・CLS・TBT の予算
describe('速さの予算（#32）', () => {
  test('予算は LCP 2.5 秒・CLS 0.1・TBT 200 ミリ秒', () => {
    expect(BUDGET).toEqual({ lcp: 2500, cls: 0.1, tbt: 200 });
  });

  test('予算の内なら何も返さず、超えた項目だけを返す（ちょうどは内）', () => {
    expect(overBudget({ lcp: 2500, cls: 0.1, tbt: 200 })).toEqual([]);
    expect(overBudget({ lcp: 2501, cls: 0.11, tbt: 199 })).toEqual(['lcp', 'cls']);
    expect(overBudget({ lcp: 100, cls: 0, tbt: 201 })).toEqual(['tbt']);
  });

  test('Lighthouse の結果から、LCP・CLS・TBT の数を読む', () => {
    const lhr = {
      audits: {
        'largest-contentful-paint': { numericValue: 1234.5 },
        'cumulative-layout-shift': { numericValue: 0.012 },
        'total-blocking-time': { numericValue: 56 },
      },
    };
    expect(readMetrics(lhr)).toEqual({ lcp: 1234.5, cls: 0.012, tbt: 56 });
  });
});

test('中央の値: 項目ごとに、測った値の真ん中を取る', () => {
  expect(
    median([
      { lcp: 3000, cls: 0, tbt: 50 },
      { lcp: 1000, cls: 0.2, tbt: 10 },
      { lcp: 2000, cls: 0.1, tbt: 30 },
    ]),
  ).toEqual({ lcp: 2000, cls: 0.1, tbt: 30 });
});

describe('scripts/perf.mjs（#32）', () => {
  const quiet = () => ({ log: vi.fn(), error: vi.fn() });

  test('画面ごとに測り、全部が予算の内なら 0 を返す。cookie を渡し、表を出す', async () => {
    const measured = [];
    const out = quiet();
    const lcps = [2600, 900, 1000, 800, 700, 2400];
    const code = await main(['--base', 'http://localhost:3300', '--cookie', 'a=1', '/home', '/x'], {
      measure: async (url, options) => {
        measured.push([url, options.cookie]);
        return { lcp: lcps.shift(), cls: 0, tbt: 10 };
      },
      ...out,
    });
    expect(code).toBe(0);
    // Three runs a page; the middle one counts, so one slow run does not fail a page.
    expect(measured).toEqual([
      ...Array(3).fill(['http://localhost:3300/home', 'a=1']),
      ...Array(3).fill(['http://localhost:3300/x', 'a=1']),
    ]);
    expect(out.log.mock.calls.flat().join('\n')).toMatch(/\/home\s+lcp=1000ms cls=0 tbt=10ms\s+ok/);
    expect(out.log.mock.calls.flat().join('\n')).toMatch(/\/x\s+lcp=800ms/);
  });

  test('予算を超えた画面があれば 1 を返し、超えた項目を書く', async () => {
    const out = quiet();
    const code = await main(['--base', 'http://localhost:3300', '/slow'], {
      measure: async () => ({ lcp: 3100, cls: 0.2, tbt: 10 }),
      ...out,
    });
    expect(code).toBe(1);
    expect(out.log.mock.calls.flat().join('\n')).toMatch(/\/slow .*over: lcp, cls/);
  });

  test('本物の Chromium と Lighthouse で、小さなページの LCP・CLS・TBT を測る', async () => {
    const server = createServer((request, response) => {
      response.setHeader('content-type', 'text/html; charset=utf-8');
      response.end('<!doctype html><html lang="ja"><title>t</title><h1>速さの試し</h1>');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const { port } = server.address();
      const metrics = await measure(`http://127.0.0.1:${port}/`, { cookie: 'a=1' });
      expect(metrics.lcp).toBeGreaterThan(0);
      expect(metrics.cls).toBe(0);
      expect(metrics.tbt).toBeGreaterThanOrEqual(0);
    } finally {
      server.close();
    }
  }, 120_000);

  test('入口は引数を main に渡し、結果を終了の番号にする（測る画面が無ければ 0）', async () => {
    const argv = process.argv;
    process.argv = ['node', 'scripts/perf.mjs'];
    try {
      await import('./perf.mjs');
      expect(process.exitCode).toBe(0);
    } finally {
      process.argv = argv;
      process.exitCode = undefined;
    }
  });
});
