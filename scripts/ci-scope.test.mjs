// Tests for scripts/lib/ci-scope.mjs (ADR-0073): a push whose changes since the last fully
// verified commit touch only documents runs the light checks; anything else, or any doubt, runs
// every gate.
import { describe, expect, it, vi } from 'vitest';
import {
  FULL_JOBS,
  GATE_INPUTS,
  decide,
  defaultDeps,
  isDocsOnly,
  main,
  pickBase,
} from './lib/ci-scope.mjs';

describe('isDocsOnly', () => {
  it('文書・README・CHANGELOG・LICENSE・CLAUDE.md・.claude/ だけなら true', () => {
    expect(
      isDocsOnly([
        'docs/test-reports/issue-0001-x.md',
        'docs/test-reports/evidence/issue-0001-x/a-375.jpg',
        'README.md',
        'CHANGELOG.md',
        'LICENSE',
        'CLAUDE.md',
        '.claude/rules/tdd.md',
      ]),
    ).toBe(true);
  });

  it('コード・テスト・スクリプト・設定・CI が 1 つでも入れば false。空も false', () => {
    for (const file of [
      'src/a.ts',
      'app/page.tsx',
      'e2e/a.spec.ts',
      'scripts/lib/check-docs.mjs',
      'package.json',
      'pnpm-lock.yaml',
      '.github/workflows/ci.yml',
      'docker-compose.yml',
      'docs-like.md',
      // Documents a gate reads (ADR-0073 review 1): check-authz, scripts/quality-gates.test.ts.
      'docs/architecture/threat-model.md',
      'docs/guides/local-development.md',
      '.claude/settings.json',
    ]) {
      expect(isDocsOnly(['docs/a.md', file]), file).toBe(false);
    }
    expect(isDocsOnly([])).toBe(false);
  });
});

describe('pickBase', () => {
  it('祖先を新しい順に見て、全部の確認が通った最初の commit を返す。無ければ null', () => {
    const verified = new Set(['c3', 'c5']);
    expect(pickBase(['c2', 'c3', 'c4', 'c5'], (sha) => verified.has(sha))).toBe('c3');
    expect(pickBase(['c2', 'c4'], (sha) => verified.has(sha))).toBeNull();
  });
});

describe('decide', () => {
  const deps = (over = {}) => ({
    ancestors: () => ['p1', 'p2'],
    fullyVerified: (sha) => sha === 'p2',
    changedFiles: () => ['docs/a.md'],
    ...over,
  });

  it('全部が通った commit からの変更が文書だけなら light、その commit を基準として返す', () => {
    expect(decide(deps())).toEqual({ scope: 'docs', base: 'p2', files: ['docs/a.md'] });
  });

  it('コードの変更が混じる、基準が無い、確かめに失敗する、のどれでも full', () => {
    expect(decide(deps({ changedFiles: () => ['docs/a.md', 'src/a.ts'] })).scope).toBe('full');
    expect(decide(deps({ fullyVerified: () => false })).scope).toBe('full');
    expect(
      decide(
        deps({
          ancestors: () => {
            throw new Error('git failed');
          },
        }),
      ),
    ).toMatchObject({ scope: 'full', reason: 'git failed' });
  });
});

describe('main', () => {
  it('GITHUB_OUTPUT に scope を書き、理由を出す', () => {
    const lines = [];
    const append = vi.fn();
    const status = main({
      deps: {
        ancestors: () => ['p1'],
        fullyVerified: () => true,
        changedFiles: () => ['README.md'],
      },
      append,
      log: (line) => lines.push(line),
      output: '/tmp/out',
    });
    expect(status).toBe(0);
    expect(append).toHaveBeenCalledWith('/tmp/out', 'scope=docs\n');
    expect(lines.join('\n')).toMatch(/docs only since p1/);
  });

  it('全部を回すときも 0 で終わる（判定は止めない）', () => {
    const append = vi.fn();
    const lines = [];
    main({
      deps: { ancestors: () => [], fullyVerified: () => true, changedFiles: () => [] },
      append,
      log: (line) => lines.push(line),
      output: '/tmp/out',
    });
    expect(append).toHaveBeenCalledWith('/tmp/out', 'scope=full\n');
    expect(lines.join('\n')).toMatch(/full: no fully verified ancestor/);
  });

  it('全部の確認は、全部のゲートのジョブと 3 つのブラウザ', () => {
    expect(FULL_JOBS).toEqual(['verify', 'e2e (chromium)', 'e2e (firefox)', 'e2e (webkit)']);
  });
});

describe('defaultDeps', () => {
  it('git の祖先と差分、GitHub のチェックの結果を読む', () => {
    const calls = [];
    const run = (cmd, args) => {
      calls.push([cmd, ...args].join(' '));
      if (args[0] === 'log') return 'a1\na2\n';
      if (args[0] === 'diff') return 'docs/a.md\0README.md\0';
      return args[1].includes('/full/')
        ? JSON.stringify([...FULL_JOBS])
        : args[1].includes('/legacy/')
          ? JSON.stringify(['verify (8 gates)'])
          : JSON.stringify(['verify', 'e2e (chromium)']);
    };
    const deps = defaultDeps({ run, repo: 'o/r' });
    expect(deps.ancestors()).toEqual(['a1', 'a2']);
    expect(deps.changedFiles('a2')).toEqual(['docs/a.md', 'README.md']);
    expect(deps.fullyVerified('full/x')).toBe(true);
    expect(deps.fullyVerified('legacy/x')).toBe(true);
    expect(deps.fullyVerified('part')).toBe(false);
    expect(calls).toContain('git log --format=%H -n 50 HEAD~1');
    expect(calls).toContain('git diff --no-renames -z --name-only a2 HEAD');
    expect(calls.some((c) => c.startsWith('gh api repos/o/r/commits/part/check-runs'))).toBe(true);
  });
});

describe('PR の基準が動いたとき（ADR-0073 のレビュー 2）', () => {
  const deps = (over = {}) => ({
    ancestors: () => ['p1', 'p2'],
    fullyVerified: (sha) => sha === 'p2',
    changedFiles: () => ['docs/a.md'],
    ...over,
  });

  it('PR の基準の commit が、全部が通った commit の祖先でなければ full（新しい main とのマージが確かめられていない）', () => {
    expect(decide(deps({ prBase: 'm2', isAncestor: () => false }))).toMatchObject({
      scope: 'full',
      reason: expect.stringMatching(/PR base/),
    });
  });

  it('PR の基準が祖先なら、これまでどおり文書だけは light', () => {
    const isAncestor = vi.fn(() => true);
    expect(decide(deps({ prBase: 'm1', isAncestor })).scope).toBe('docs');
    expect(isAncestor).toHaveBeenCalledWith('m1', 'p2');
  });

  it('isAncestor は git merge-base --is-ancestor の終了コードを読み、失敗は false', () => {
    const ok = defaultDeps({ run: () => '', repo: 'o/r', prBase: 'm1' });
    expect(ok.prBase).toBe('m1');
    expect(ok.isAncestor('m1', 'p2')).toBe(true);
    const calls = [];
    const no = defaultDeps({
      run: (cmd, args) => {
        calls.push([cmd, ...args].join(' '));
        throw new Error('exit 1');
      },
      repo: 'o/r',
    });
    expect(no.isAncestor('m1', 'p2')).toBe(false);
    expect(calls).toEqual(['git merge-base --is-ancestor m1 p2']);
  });
});

describe('名前の変更（ADR-0073 のレビュー 2）', () => {
  it('コードを docs/ へ移すと、消えた道と増えた道の両方が出て full になる', async () => {
    const { execFileSync } = await import('node:child_process');
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'ci-scope-'));
    const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
    try {
      git('init', '-q');
      git('config', 'user.email', 't@example.com');
      git('config', 'user.name', 't');
      mkdirSync(join(dir, 'src'));
      mkdirSync(join(dir, 'docs'));
      writeFileSync(join(dir, 'src/x.ts'), 'export const x = 1;\n'.repeat(20));
      git('add', 'src/x.ts');
      git('commit', '-qm', 'base');
      const base = git('rev-parse', 'HEAD').trim();
      git('mv', 'src/x.ts', 'docs/x.ts');
      git('commit', '-qm', 'move');
      const deps = defaultDeps({
        run: (cmd, args) => execFileSync(cmd, args, { cwd: dir, encoding: 'utf8' }),
        repo: 'o/r',
      });
      const files = deps.changedFiles(base);
      expect(files.sort()).toEqual(['docs/x.ts', 'src/x.ts']);
      expect(isDocsOnly(files)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('defaultDeps の既定', () => {
  it('このリポジトリの本物の git で、40 桁の祖先を読む', () => {
    const ancestors = defaultDeps({ repo: 'o/r' }).ancestors();
    expect(ancestors.length).toBeGreaterThan(0);
    expect(ancestors.every((sha) => /^[0-9a-f]{40}$/.test(sha))).toBe(true);
  });
});

describe('scripts/ci-scope.mjs', () => {
  it('GITHUB_OUTPUT が無ければ、理由を書いて 1（GitHub Actions の外では動かない）', async () => {
    const out = process.env.GITHUB_OUTPUT;
    delete process.env.GITHUB_OUTPUT;
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await import('./ci-scope.mjs');
      expect(process.exitCode).toBe(1);
      expect(log).toHaveBeenCalledWith(expect.stringMatching(/GITHUB_OUTPUT is not set/));
    } finally {
      log.mockRestore();
      process.exitCode = undefined;
      if (out !== undefined) process.env.GITHUB_OUTPUT = out;
    }
  });
});

describe('確認が読む文書（ADR-0073 のレビュー 1）', () => {
  it('docs:check の外の確認が読む docs/ と .claude/ のファイルは、全部 GATE_INPUTS にある', async () => {
    const { execFileSync } = await import('node:child_process');
    const { readFileSync } = await import('node:fs');
    const files = execFileSync('git', ['ls-files', 'scripts', 'e2e', 'src', 'eslint-rules'], {
      encoding: 'utf8',
    })
      .split('\n')
      .filter((file) => /\.(?:[cm]?[jt]sx?)$/.test(file))
      // docs:check runs these two (their tests build sample bundles in temp directories); the
      // light checks run docs:check.
      .filter(
        (file) => !/^scripts\/(?:lib\/)?check-(docs|traceability)(?:\.test)?\.mjs$/.test(file),
      );
    const read = new Set();
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(
        /(?:readFileSync\(|=\s*)['"]((?:docs|\.claude)\/[\w./-]+\.\w+)['"]/g,
      )) {
        read.add(match[1]);
      }
    }
    expect([...read].sort()).toEqual([...GATE_INPUTS].sort());
  });
});
