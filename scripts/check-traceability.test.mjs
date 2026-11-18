// Tests for scripts/lib/check-traceability.mjs (#30). Each test builds a small repository in a temp
// directory with requirements, a routing table, tests and docs/requirements/traceability.md,
// breaks one thing, and runs the check in-process.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { main } from './lib/check-traceability.mjs';

let root;
afterEach(() => root && rmSync(root, { recursive: true, force: true }));

const write = (path, text) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
};

/** A repository where everything is traced. */
function repo({ trace, spec } = {}) {
  root = mkdtempSync(join(tmpdir(), 'trace-'));
  write(
    'docs/requirements/functional.md',
    '| ID | 名前 | 確かめ方 | 段 | PBI |\n|---|---|---|---|---|\n| FR-POST-01 | 投稿 | 投稿できる | 画面 | #19 |\n',
  );
  write(
    'docs/requirements/non-functional.md',
    '| ID | 名前 | 確かめ方 | 段 | PBI |\n|---|---|---|---|---|\n| NFR-SEC-01 | 鍵 | 漏れない | 単体 | #10 |\n',
  );
  write(
    'docs/architecture/routing.md',
    '## 1. URL の一覧\n\n| URL | 画面 |\n|---|---|\n| `/home` | タイムライン |\n| `/{username}/likes` | いいね |\n\n## 2. 次\n',
  );
  write(
    'e2e/post.spec.ts',
    spec ?? "test('FR-POST-01 投稿できる', () => {});\ntest('いいねの一覧', () => {});\n",
  );
  write('src/a.test.ts', "it('NFR-SEC-01 鍵は漏れない', () => {});\n");
  write(
    'docs/requirements/traceability.md',
    trace ??
      [
        '## 要件',
        '| ID | PBI | テスト |',
        '|---|---|---|',
        '| FR-POST-01 | #19 | `e2e/post.spec.ts` › FR-POST-01 投稿できる |',
        '| NFR-SEC-01 | #10 | `src/a.test.ts` › NFR-SEC-01 鍵は漏れない |',
        '',
        '## URL',
        '| URL | テスト |',
        '|---|---|',
        '| `/home` | `e2e/post.spec.ts` › FR-POST-01 投稿できる |',
        '| `/{username}/likes` | `e2e/post.spec.ts` › いいねの一覧 |',
        '',
      ].join('\n'),
  );
}

function run() {
  const errors = [];
  const code = main(['--root', root], { error: (line) => errors.push(line), log: () => {} });
  return { code, errors: errors.join('\n') };
}

test('全部の要件と URL がテストに結びついていれば 0', () => {
  repo();
  expect(run()).toEqual({ code: 0, errors: '' });
});

test('テストの無い要件の ID を指摘する', () => {
  repo({
    trace:
      '## 要件\n| ID | PBI | テスト |\n|---|---|---|\n| FR-POST-01 | #19 | `e2e/post.spec.ts` › FR-POST-01 投稿できる |\n\n## URL\n| URL | テスト |\n|---|---|\n| `/home` | `e2e/post.spec.ts` › FR-POST-01 投稿できる |\n| `/{username}/likes` | `e2e/post.spec.ts` › いいねの一覧 |\n',
  });
  const { code, errors } = run();
  expect(code).toBe(1);
  expect(errors).toMatch(/NFR-SEC-01: no test/);
});

test('無いファイル・無いテストの名前・ID を持たないテストを指摘する', () => {
  repo({ spec: "test('投稿できる', () => {});\n" });
  const { code, errors } = run();
  expect(code).toBe(1);
  expect(errors).toMatch(
    /FR-POST-01: e2e\/post\.spec\.ts has no test named "FR-POST-01 投稿できる"/,
  );
  expect(errors).toMatch(
    /\/\{username\}\/likes: e2e\/post\.spec\.ts has no test named "いいねの一覧"/,
  );
  rmSync(root, { recursive: true, force: true });
  repo({
    trace:
      '## 要件\n| ID | PBI | テスト |\n|---|---|---|\n| FR-POST-01 | #19 | `e2e/none.spec.ts` › x |\n| NFR-SEC-01 | #10 | `src/a.test.ts` › NFR-SEC-01 鍵は漏れない |\n\n## URL\n| URL | テスト |\n|---|---|\n| `/home` | `e2e/post.spec.ts` › FR-POST-01 投稿できる |\n| `/{username}/likes` | `e2e/post.spec.ts` › いいねの一覧 |\n',
  });
  expect(run().errors).toMatch(/FR-POST-01: e2e\/none\.spec\.ts does not exist/);
  rmSync(root, { recursive: true, force: true });
  repo({ spec: "test('投稿できる', () => {});\ntest('いいねの一覧', () => {});\n" });
  write(
    'docs/requirements/traceability.md',
    '## 要件\n| ID | PBI | テスト |\n|---|---|---|\n| FR-POST-01 | #19 | `e2e/post.spec.ts` › 投稿できる |\n| NFR-SEC-01 | #10 | `src/a.test.ts` › NFR-SEC-01 鍵は漏れない |\n\n## URL\n| URL | テスト |\n|---|---|\n| `/home` | `e2e/post.spec.ts` › 投稿できる |\n| `/{username}/likes` | `e2e/post.spec.ts` › いいねの一覧 |\n',
  );
  expect(run().errors).toMatch(/FR-POST-01: e2e\/post\.spec\.ts does not mention FR-POST-01/);
});

test('画面のテストの無い URL を指摘する。画面のテストは e2e/ の中', () => {
  repo({
    trace:
      '## 要件\n| ID | PBI | テスト |\n|---|---|---|\n| FR-POST-01 | #19 | `e2e/post.spec.ts` › FR-POST-01 投稿できる |\n| NFR-SEC-01 | #10 | `src/a.test.ts` › NFR-SEC-01 鍵は漏れない |\n\n## URL\n| URL | テスト |\n|---|---|\n| `/home` | `src/a.test.ts` › NFR-SEC-01 鍵は漏れない |\n',
  });
  const { code, errors } = run();
  expect(code).toBe(1);
  expect(errors).toMatch(/\/\{username\}\/likes: no test/);
  expect(errors).toMatch(/\/home: src\/a\.test\.ts is not a Playwright test/);
});

test('traceability.md が無ければ 1', () => {
  repo();
  rmSync(join(root, 'docs/requirements/traceability.md'));
  const { code, errors } = run();
  expect(code).toBe(1);
  expect(errors).toMatch(/traceability\.md does not exist/);
});

test('URL の表が無ければ、全部の URL を指摘する', () => {
  repo({
    trace:
      '## 要件\n| ID | PBI | テスト |\n|---|---|---|\n| FR-POST-01 | #19 | `e2e/post.spec.ts` › FR-POST-01 投稿できる |\n| NFR-SEC-01 | #10 | `src/a.test.ts` › NFR-SEC-01 鍵は漏れない |\n',
  });
  const { code, errors } = run();
  expect(code).toBe(1);
  expect(errors).toMatch(/\/home: no test/);
});

test('あとの PBI が受け持つ要件は「#NN で確かめる」と書ける。要件の表がその PBI を名指ししているときだけ（ADR-0053）', () => {
  repo();
  write(
    'docs/requirements/non-functional.md',
    '| ID | 基準 | 確かめ方 | 満たす PBI |\n|---|---|---|---|\n| NFR-SEC-01 | 鍵 | 単体 | #10・#33 |\n| NFR-PERF-01 | 速さ | 計測 | #32 |\n',
  );
  const trace = (perf) =>
    write(
      'docs/requirements/traceability.md',
      `## 要件\n| ID | PBI | テスト |\n|---|---|---|\n| FR-POST-01 | #19 | \`e2e/post.spec.ts\` › FR-POST-01 投稿できる |\n| NFR-SEC-01 | #10 | \`src/a.test.ts\` › NFR-SEC-01 鍵は漏れない |\n| NFR-PERF-01 | #32 | ${perf} |\n\n## URL\n| URL | テスト |\n|---|---|\n| \`/home\` | \`e2e/post.spec.ts\` › FR-POST-01 投稿できる |\n| \`/{username}/likes\` | \`e2e/post.spec.ts\` › いいねの一覧 |\n`,
    );
  trace('#32 で確かめる');
  expect(run()).toEqual({ code: 0, errors: '' });
  trace('#31 で確かめる');
  const { code, errors } = run();
  expect(code).toBe(1);
  expect(errors).toMatch(/NFR-PERF-01: #31 does not own it/);
});

// NFR-MAINT-04: 全ての画面のルートに、Playwright のテストが 1 本以上ある
test('このリポジトリでは、全部の要件と URL がテストに結びついている（scripts/check-traceability.mjs）', async () => {
  root = undefined;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await import('./check-traceability.mjs');
    expect(errors.mock.calls.map((call) => call[0]).join('\n')).toBe('');
    expect(process.exitCode).toBe(0);
  } finally {
    process.exitCode = undefined;
  }
});
