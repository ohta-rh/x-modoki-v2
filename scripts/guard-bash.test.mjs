// Tests for scripts/lib/guard-bash.mjs (ADR-0074): the PreToolUse hook that refuses the Bash
// commands that went wrong in Milestone 1, instead of a rule asking not to run them.
import { describe, expect, it, vi } from 'vitest';
import { check, main } from './lib/guard-bash.mjs';

describe('check', () => {
  it('全部まとめてステージする git add を止める（パスを名指しする）', () => {
    for (const command of [
      'git add -A',
      'git add --all',
      'git add .',
      'git add ./',
      'cd x && git add -A docs',
    ]) {
      expect(check(command), command).toMatch(/stage files by path/);
    }
  });

  it('確認を飛ばす --no-verify を止める', () => {
    expect(check('git commit --no-verify -m x')).toMatch(/--no-verify/);
    expect(check('git push --no-verify origin x')).toMatch(/--no-verify/);
  });

  it('確認と commit・push を ; でつなぐのを止める（落ちても commit される: 9ca1b92）', () => {
    expect(check('pnpm verify; git commit -m x')).toMatch(/&&/);
    expect(check('node scripts/check-docs.mjs ;git push')).toMatch(/&&/);
  });

  it('名前でプロセスを止めるのを止める（PID で止める）', () => {
    expect(check('pkill -f "next start"')).toMatch(/PID/);
    expect(check('killall node')).toMatch(/PID/);
  });

  it('シェルの書き方の幅でも止める（全体のオプション、パス、前置き、bash -c、改行、commit -n）', () => {
    for (const [command, reason] of [
      ['git -C /repo add -A', /stage files by path/],
      ['/usr/bin/git add .', /stage files by path/],
      ['env GIT_DIR=x git --work-tree=/repo add --all', /stage files by path/],
      ["bash -c 'git add -A'", /stage files by path/],
      ['(cd x && git add .)', /stage files by path/],
      ['git commit -n -m x', /--no-verify/],
      ['git commit -anm x', /--no-verify/],
      ['pnpm verify\ngit commit -m x', /&&/],
      ['pnpm verify || git commit -m x', /&&/],
    ]) {
      expect(check(command), command).toMatch(reason);
    }
  });

  it('引用符の後ろの旗、名前での pkill、& でつないだ commit も止める（ADR-0074 のレビュー 1）', () => {
    for (const [command, reason] of [
      ['git commit -m "fix: x" --no-verify', /--no-verify/],
      ["git commit -m 'x' -n", /--no-verify/],
      ['git add "src/a b.ts" -A', /stage files by path/],
      [`bash -c "git commit -m 'x' --no-verify"`, /--no-verify/],
      ['pkill next-server', /PID/],
      ['pkill -x node', /PID/],
      ['pnpm verify & git commit -m x', /&&/],
    ]) {
      expect(check(command), command).toMatch(reason);
    }
  });

  it('閉じていない引用符は読めないので止める', () => {
    expect(check('git commit -m "unterminated')).toMatch(/could not parse/);
    expect(check("git commit -m 'unterminated")).toMatch(/could not parse/);
    expect(check('echo "ends in a backslash\\')).toMatch(/could not parse/);
  });

  it('入れ子が深すぎる bash -c は読み切れないので止める', () => {
    expect(check(`bash -c "bash -c 'bash -c \\"bash -c ls\\"'"`)).toMatch(/too deeply nested/);
  });

  it('代入だけの行と、サブコマンドの無い git は通す', () => {
    expect(check('FOO=1 BAR=2')).toBeNull();
    expect(check('git --version')).toBeNull();
  });

  it('ふつうのコマンドは通す', () => {
    for (const command of [
      'git add src/a.ts docs/b.md',
      'git add "src/a b.ts"',
      'git add --pathspec-from-file=/tmp/p.txt',
      'pnpm verify && git commit -m x',
      'git commit -m "stage the report"',
      'git commit -m "a; b || c & d"',
      // Inside double quotes a backslash escapes ", \, $ and ` (the shell's rule).
      'grep -E "(x|=)[\'\\"]docs" file',
      'echo "a \\\\" b',
      // Outside quotes a backslash makes the next character literal: no separator, no commit.
      'echo a\\; git commit -m x',
      'echo "git add -A"',
      'kill 1234',
      'echo "a; b"',
    ]) {
      expect(check(command), command).toBeNull();
    }
  });
});

describe('main', () => {
  it('止めるときは理由を stderr に書いて 2（Claude に理由が届く）', () => {
    const err = vi.fn();
    const status = main(JSON.stringify({ tool_input: { command: 'git add -A' } }), err);
    expect(status).toBe(2);
    expect(err).toHaveBeenCalledWith(expect.stringMatching(/^guard-bash: .*stage files by path/));
  });

  it('通すときは 0', () => {
    const err = vi.fn();
    expect(main(JSON.stringify({ tool_input: { command: 'ls' } }), err)).toBe(0);
    expect(err).not.toHaveBeenCalled();
  });

  it('読めない入力・コマンドの無い入力は止める（分からないものは通さない: gate-design）', () => {
    const err = vi.fn();
    expect(main('not json', err)).toBe(2);
    expect(main(JSON.stringify({ tool_input: {} }), err)).toBe(2);
    expect(err).toHaveBeenCalledWith(expect.stringMatching(/could not read the command/));
  });
});

describe('既定の書き出し先と、コマンドとしての入口', () => {
  it('理由は標準エラーに書く', () => {
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      expect(main(JSON.stringify({ tool_input: { command: 'killall node' } }))).toBe(2);
      expect(write).toHaveBeenCalledWith(expect.stringMatching(/^guard-bash: .*PID/));
    } finally {
      write.mockRestore();
    }
  });

  it('scripts/guard-bash.mjs は標準入力を読んで、終了コードを設定する', async () => {
    vi.resetModules();
    vi.doMock('node:fs', async (original) => ({
      ...(await original()),
      readFileSync: () => JSON.stringify({ tool_input: { command: 'git add .' } }),
    }));
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      await import('./guard-bash.mjs');
      expect(process.exitCode).toBe(2);
    } finally {
      write.mockRestore();
      vi.doUnmock('node:fs');
      process.exitCode = undefined;
    }
  });
});

describe('入口で例外が出たとき', () => {
  it('標準入力が読めなければ、1（止めない）ではなく 2 で止める', async () => {
    vi.resetModules();
    vi.doMock('node:fs', async (original) => ({
      ...(await original()),
      readFileSync: () => {
        throw new Error('EAGAIN');
      },
    }));
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      await import('./guard-bash.mjs');
      expect(process.exitCode).toBe(2);
      expect(write).toHaveBeenCalledWith(expect.stringMatching(/guard-bash: .*EAGAIN/));
    } finally {
      write.mockRestore();
      vi.doUnmock('node:fs');
      process.exitCode = undefined;
    }
  });
});
