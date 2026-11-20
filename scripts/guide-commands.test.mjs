import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { guideCommands, main } from './lib/guide-commands.mjs';

const guide = `# 手順

## 1. 最初の準備

説明。

\`\`\`sh
pnpm install
sh scripts/setup-local.sh   # コメント
\`\`\`

あとの説明。

\`\`\`sh
echo not-this
\`\`\`

## 2. 毎日の起動

\`\`\`sh
pnpm dev
\`\`\`
`;

describe('guideCommands（手順書のコマンドを CI でそのまま流す、#35）', () => {
  it('見出しの節の、最初の sh のコードの塊を、そのまま返す', () => {
    expect(guideCommands(guide, '1. 最初の準備')).toBe(
      'pnpm install\nsh scripts/setup-local.sh   # コメント\n',
    );
    expect(guideCommands(guide, '2. 毎日の起動')).toBe('pnpm dev\n');
  });

  it('見出しか、その節の sh の塊が無ければ null', () => {
    expect(guideCommands(guide, '3. 無い節')).toBeNull();
    expect(
      guideCommands(
        '# t\n\n## 1. 最初の準備\n\n説明だけ\n\n## 2. 次\n```sh\nx\n```\n',
        '1. 最初の準備',
      ),
    ).toBeNull();
  });
});

const dirs = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const log = () => ({ log: vi.fn(), error: vi.fn() });

describe('scripts/guide-commands.mjs', () => {
  it('ファイルと見出しを受けて、コマンドを書き出し 0 を返す', () => {
    const dir = mkdtempSync(join(tmpdir(), 'guide-'));
    dirs.push(dir);
    const path = join(dir, 'guide.md');
    writeFileSync(path, guide);
    const write = vi.fn();
    expect(main([path, '2. 毎日の起動'], log(), write)).toBe(0);
    expect(write).toHaveBeenCalledWith('pnpm dev\n');
  });

  it('引数が足りない、または節が無ければ、使い方か理由を書いて 1 を返す（CI が止まる）', () => {
    const l = log();
    expect(main([], l, vi.fn())).toBe(1);
    expect(l.error).toHaveBeenCalledWith(expect.stringContaining('usage'));
    const dir = mkdtempSync(join(tmpdir(), 'guide-'));
    dirs.push(dir);
    const path = join(dir, 'guide.md');
    writeFileSync(path, guide);
    const m = log();
    expect(main([path, '9. 無い'], m, vi.fn())).toBe(1);
    expect(m.error).toHaveBeenCalledWith(expect.stringContaining('9. 無い'));
  });
});

describe('scripts/guide-commands.mjs をコマンドとして動かす', () => {
  it('標準出力にコマンドを書き、終了コードを 0 にする', async () => {
    const argv = process.argv;
    const dir = mkdtempSync(join(tmpdir(), 'guide-'));
    dirs.push(dir);
    const path = join(dir, 'guide.md');
    writeFileSync(path, guide);
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    process.argv = ['node', 'guide-commands.mjs', path, '2. 毎日の起動'];
    try {
      await import('./guide-commands.mjs');
      expect(out).toHaveBeenCalledWith('pnpm dev\n');
      expect(process.exitCode).toBe(0);
    } finally {
      out.mockRestore();
      process.argv = argv;
      process.exitCode = undefined;
    }
  });
});
