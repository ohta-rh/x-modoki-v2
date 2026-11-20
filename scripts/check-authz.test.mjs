// Tests for scripts/lib/check-authz.mjs (#33). Each test builds a small repository in a temp
// directory with a Server Action, a mutation function, a Route Handler, their tests and the threat
// model's list of public entries, breaks one thing, and runs the check in-process.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { checkAuthz, main } from './lib/check-authz.mjs';

let root;
afterEach(() => root && rmSync(root, { recursive: true, force: true }));

const write = (path, text) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
};

const PUBLIC_TABLE = [
  '## 6. ログインの要らない入口',
  '',
  '| 関数 | 理由 |',
  '|---|---|',
  '| `signInAction` | ログインそのもの |',
  '',
  '## 7. 次の節',
  '',
  '| 関数 | 理由 |',
  '|---|---|',
  '| `deletePostAction` | ここは入口の一覧ではない |',
  '',
].join('\n');

const THREATS = [
  '## 3. 脅威と対策',
  '',
  '| # | STRIDE | 入口 | 脅威 | 対策 | 要件 | 確かめるテスト | PBI |',
  '|---|---|---|---|---|---|---|---|',
  '| T-01 | E | Server Action | IDOR | 比べる | NFR-SEC-01 | `src/threat.test.ts` › 脅威の確かめ、`src/threat.test.ts` › もう一つ | #20 |',
  '| T-20 | R | 全部 | 否認 | 受け入れる | — | — | — |',
  '',
].join('\n');

/** A repository where every entry is checked. `tests` replaces the mutation's test file. */
function repo({ mutationTest, actionTest, routeTest, publicTable = PUBLIC_TABLE, threats } = {}) {
  root = mkdtempSync(join(tmpdir(), 'authz-'));
  write(
    'src/features/post-delete/api/actions.ts',
    "'use server';\nexport async function deletePostAction() {}\nexport async function signInAction() {}\n",
  );
  write('src/features/post-delete/api/delete-post.ts', 'export async function deletePost() {}\n');
  write('src/_app/api-routes/timeline.ts', 'export const getTimeline = async () => {};\n');
  write('src/_app/api-routes/index.ts', "export { getTimeline } from './timeline';\n");
  write('src/threat.test.ts', "it('脅威の確かめ', () => {});\ntest('もう一つ', () => {});\n");
  write(
    'src/features/post-delete/api/delete-post.test.ts',
    mutationTest ??
      [
        '// AUTHZ: deletePost UNAUTHORIZED',
        "it('ログインしていなければ UNAUTHORIZED', () => {});",
        '// AUTHZ: deletePost FORBIDDEN',
        "it('他人の投稿は FORBIDDEN', () => {});",
        '',
      ].join('\n'),
  );
  write(
    'src/features/post-delete/api/actions.test.ts',
    actionTest ?? "// AUTHZ: deletePostAction UNAUTHORIZED\nit('ログイン無しは拒む', () => {});\n",
  );
  write(
    'src/_app/api-routes/timeline.test.ts',
    routeTest ?? "// AUTHZ: getTimeline UNAUTHORIZED\ntest('ログイン無しは 401', () => {});\n",
  );
  write('docs/architecture/threat-model.md', `# 脅威\n\n${threats ?? THREATS}\n${publicTable}`);
}

const run = () => checkAuthz(root);

// NFR-SEC-01: 全部の入口の認可がテストで確かめられている
test('「他人は FORBIDDEN」のテストが無い変更の関数を指摘する', () => {
  repo({
    mutationTest: "// AUTHZ: deletePost UNAUTHORIZED\nit('ログインしていなければ', () => {});\n",
  });
  expect(run()).toEqual([
    'deletePost (src/features/post-delete/api/delete-post.ts): no test tagged FORBIDDEN or SELF',
  ]);
});

test('全部の入口に印のついたテストがあれば、何も指摘しない', () => {
  repo();
  expect(run()).toEqual([]);
});

test('自分の分しか変えられない変更の関数は、FORBIDDEN の代わりに SELF の印でよい', () => {
  repo({
    mutationTest: [
      '// AUTHZ: deletePost UNAUTHORIZED',
      "it('ログインしていなければ', () => {});",
      '// AUTHZ: deletePost SELF',
      "it('セッションの利用者の行だけが変わる', () => {});",
      '',
    ].join('\n'),
  });
  expect(run()).toEqual([]);
});

test('「ログイン無しは拒む」のテストが無い Server Action・変更の関数・Route Handler を指摘する', () => {
  repo({
    mutationTest: "// AUTHZ: deletePost FORBIDDEN\nit('他人', () => {});\n",
    actionTest: "it('ログイン無しは拒む', () => {});\n",
    routeTest: "test('401', () => {});\n",
  });
  expect(run()).toEqual([
    'deletePostAction (src/features/post-delete/api/actions.ts): no test tagged UNAUTHORIZED',
    'deletePost (src/features/post-delete/api/delete-post.ts): no test tagged UNAUTHORIZED',
    'getTimeline (src/_app/api-routes/timeline.ts): no test tagged UNAUTHORIZED',
  ]);
});

test('印を重ねて書けば、その下のテストに全部が効く', () => {
  repo({
    mutationTest: [
      '// AUTHZ: deletePost UNAUTHORIZED',
      '// AUTHZ: deletePost FORBIDDEN',
      "it('他人は FORBIDDEN、ログイン無しは UNAUTHORIZED', () => {});",
      '',
    ].join('\n'),
  });
  expect(run()).toEqual([]);
});

test('印は、テストの直前にあるものだけを数える', () => {
  repo({
    actionTest:
      "// AUTHZ: deletePostAction UNAUTHORIZED\nconst helper = () => {};\nit('ログイン無しは拒む', () => {});\n",
  });
  expect(run()).toEqual([
    'deletePostAction (src/features/post-delete/api/actions.ts): no test tagged UNAUTHORIZED',
  ]);
});

test('ログインの要らない入口は、脅威の文書に理由と載っていれば求めない。知らない名前や理由の無い行は指摘する', () => {
  repo({
    publicTable: [
      '## 6. ログインの要らない入口',
      '',
      '| 関数 | 理由 |',
      '|---|---|',
      '| `signInAction` |  |',
      '| `noSuchFunction` | 消えた |',
      '',
    ].join('\n'),
  });
  expect(run()).toEqual([
    'signInAction: listed as public in docs/architecture/threat-model.md without a reason',
    'noSuchFunction: listed as public in docs/architecture/threat-model.md but not an entry',
  ]);
});

test('脅威の文書にログインの要らない入口の節が無ければ、全部の入口に印を求める', () => {
  repo({ publicTable: '## 6. ほかの節\n' });
  expect(run()).toEqual([
    'signInAction (src/features/post-delete/api/actions.ts): no test tagged UNAUTHORIZED',
  ]);
});

test('ファイルの最後の行の印は、続くテストが無いので数えない', () => {
  repo({ routeTest: "test('401', () => {});\n// AUTHZ: getTimeline UNAUTHORIZED" });
  expect(run()).toEqual([
    'getTimeline (src/_app/api-routes/timeline.ts): no test tagged UNAUTHORIZED',
  ]);
});

// NFR-SEC-01: 脅威の文書の全部の行が、通っているテストに結びついている
test('脅威の表の「確かめるテスト」は、実際にあるファイルとテストの名前でなければ指摘する', () => {
  repo({
    threats: [
      '## 3. 脅威と対策',
      '',
      '| # | STRIDE | 入口 | 脅威 | 対策 | 要件 | 確かめるテスト | PBI |',
      '|---|---|---|---|---|---|---|---|',
      '| T-01 | E | A | B | C | D | `src/threat.test.ts` › 無い名前 | #20 |',
      '| T-02 | E | A | B | C | D | `src/nowhere.test.ts` › 何か | #20 |',
      '| T-03 | E | A | B | C | D | 文章だけの説明 | #20 |',
      '| T-20 | R | 全部 | 否認 | 受け入れる | — | — | — |',
      '',
    ].join('\n'),
  });
  expect(run()).toEqual([
    'T-01: src/threat.test.ts has no test named "無い名前"',
    'T-02: src/nowhere.test.ts does not exist',
    'T-03: names no test (`path` › test name)',
  ]);
});

test('知らない関数の名前を書いた印を指摘する', () => {
  repo({
    routeTest:
      "// AUTHZ: getTimeline UNAUTHORIZED\ntest('401', () => {});\n// AUTHZ: getTimelines UNAUTHORIZED\ntest('x', () => {});\n",
  });
  expect(run()).toEqual([
    'src/_app/api-routes/timeline.test.ts: AUTHZ tag names getTimelines, which is not an entry',
  ]);
});

test('main は指摘があれば 1、無ければ 0 を返し、指摘を書き出す', () => {
  repo({ actionTest: "it('x', () => {});\n" });
  const log = { log: vi.fn(), error: vi.fn() };
  expect(main(['--root', root], log)).toBe(1);
  expect(log.error.mock.calls.flat().join('\n')).toMatch(/deletePostAction/);
  repo();
  expect(main(['--root', root], log)).toBe(0);
  expect(log.log).toHaveBeenCalledWith('authz check passed: 3 entries, 1 public');
});

// NFR-SEC-01: このリポジトリの全部の入口
test('このリポジトリでは、全部の入口の認可がテストで確かめられている（scripts/check-authz.mjs）', async () => {
  root = undefined;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await import('./check-authz.mjs');
    expect(errors.mock.calls.map((call) => call[0]).join('\n')).toBe('');
    expect(process.exitCode).toBe(0);
  } finally {
    process.exitCode = undefined;
  }
});
