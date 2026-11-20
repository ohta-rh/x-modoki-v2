// Tests for scripts/lib/format-edited.mjs (ADR-0074): the PostToolUse hook that formats a file
// Claude has just edited, so the format gate never fails on it and no separate step is spent.
import { describe, expect, it, vi } from 'vitest';
import { main, target } from './lib/format-edited.mjs';

const root = '/repo';

describe('target', () => {
  it('リポジトリの中の、Prettier が扱うファイルの道を返す', () => {
    expect(target({ tool_input: { file_path: '/repo/src/a.tsx' } }, root)).toBe('src/a.tsx');
    expect(target({ tool_input: { file_path: '/repo/scripts/b.mjs' } }, root)).toBe(
      'scripts/b.mjs',
    );
    expect(target({ tool_input: { file_path: '/repo/.github/workflows/ci.yml' } }, root)).toBe(
      '.github/workflows/ci.yml',
    );
  });

  it('リポジトリの外、node_modules、扱わない拡張子、道が無いときは null', () => {
    for (const file_path of [
      '/tmp/a.ts',
      '/repo/node_modules/x/a.js',
      '/repo/a.png',
      '/repo/LICENSE',
    ]) {
      expect(target({ tool_input: { file_path } }, root), file_path).toBeNull();
    }
    expect(target({ tool_input: {} }, root)).toBeNull();
  });
});

describe('main', () => {
  it('対象なら prettier --write を、そのファイルにだけ流す', () => {
    const run = vi.fn();
    expect(
      main(JSON.stringify({ tool_input: { file_path: '/repo/src/a.ts' } }), { root, run }),
    ).toBe(0);
    expect(run).toHaveBeenCalledWith(
      'node_modules/.bin/prettier',
      ['--write', '--ignore-unknown', 'src/a.ts'],
      root,
    );
  });

  it('対象でない、読めない入力、整形に失敗、のどれでも 0（編集は止めない）', () => {
    const run = vi.fn(() => {
      throw new Error('syntax error');
    });
    expect(main(JSON.stringify({ tool_input: { file_path: '/tmp/a.ts' } }), { root, run })).toBe(0);
    expect(main('not json', { root, run })).toBe(0);
    expect(
      main(JSON.stringify({ tool_input: { file_path: '/repo/src/a.ts' } }), { root, run }),
    ).toBe(0);
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe('既定の場所と、コマンドとしての入口', () => {
  it('既定では、このリポジトリの Prettier で本物のファイルを整える', async () => {
    const { mkdtempSync, readFileSync, rmSync, writeFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(process.cwd(), '.tmp-format-'));
    const file = join(dir, 'a.mjs');
    writeFileSync(file, 'const  a = { b:1 }\n');
    try {
      expect(main(JSON.stringify({ tool_input: { file_path: file } }))).toBe(0);
      expect(readFileSync(file, 'utf8')).toBe('const a = { b: 1 };\n');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('scripts/format-edited.mjs は標準入力を読んで、終了コード 0 を設定する', async () => {
    vi.resetModules();
    vi.doMock('node:fs', async (original) => ({
      ...(await original()),
      readFileSync: () => JSON.stringify({ tool_input: { file_path: '/elsewhere/a.ts' } }),
    }));
    try {
      await import('./format-edited.mjs');
      expect(process.exitCode).toBe(0);
    } finally {
      vi.doUnmock('node:fs');
      process.exitCode = undefined;
    }
  });
});
