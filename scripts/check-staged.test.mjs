// Tests for scripts/lib/check-staged.mjs (#39, W1 and W2 in docs/research/retrospective-m1.md): the
// documentation checks run on what is about to be committed, not on the working tree.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportIndex, main } from './lib/check-staged.mjs';

const dirs = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const temp = (prefix) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(dir);
  return dir;
};
const log = () => ({ log: vi.fn(), error: vi.fn() });

describe('exportIndex', () => {
  it('書き出すのはステージした中身で、作業中のファイルではない', () => {
    const repo = temp('check-staged-repo-');
    const git = (...args) => execFileSync('git', args, { cwd: repo, stdio: 'pipe' });
    git('init', '-q');
    writeFileSync(join(repo, 'a.md'), 'staged\n');
    git('add', 'a.md');
    writeFileSync(join(repo, 'a.md'), 'working tree\n');
    writeFileSync(join(repo, 'b.md'), 'never staged\n');
    const out = temp('check-staged-out-');
    exportIndex(repo, out);
    expect(readFileSync(join(out, 'a.md'), 'utf8')).toBe('staged\n');
    expect(() => readFileSync(join(out, 'b.md'))).toThrow();
  });
});

describe('main', () => {
  it('ステージした木で、ドキュメントと要件の結びつきの 2 つを確かめ、片方でも落ちたら 1', () => {
    const seen = [];
    const ok = (root) => (seen.push(root), 0);
    const exported = vi.fn();
    expect(main(log(), { exportIndex: exported, checks: [ok, ok] })).toBe(0);
    expect(exported).toHaveBeenCalledTimes(1);
    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(seen[1]);
    expect(main(log(), { exportIndex: vi.fn(), checks: [ok, () => 1] })).toBe(1);
  });

  it('書き出した木は、確かめたあと消す（落ちても）', () => {
    let root = '';
    main(log(), {
      exportIndex: (_repo, out) => writeFileSync(join((root = out), 'x.md'), 'x'),
      checks: [() => 1],
    });
    expect(() => readFileSync(join(root, 'x.md'))).toThrow();
  });

  it('既定では、このリポジトリのステージした木を、本物の 2 つの確認で確かめる', () => {
    const l = log();
    expect(main(l)).toBe(0);
    expect(l.log).toHaveBeenCalledWith(expect.stringMatching(/^docs check passed/));
    expect(l.log).toHaveBeenCalledWith('traceability check passed');
  });
});

describe('scripts/check-staged.mjs', () => {
  it('コマンドとして動かすと、終了コードを設定する', async () => {
    const out = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await import('./check-staged.mjs');
      expect(process.exitCode).toBe(0);
    } finally {
      out.mockRestore();
      process.exitCode = undefined;
    }
  });
});
