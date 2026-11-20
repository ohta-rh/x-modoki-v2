import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkSrcLayers, main } from './lib/check-src-layers.mjs';

const LAYERS = ['_app', '_pages', 'widgets', 'features', 'entities', 'shared'];
const ALL = LAYERS.map((l) => `${l}/`);
const roots = [];

function makeRoot(entries) {
  const root = mkdtempSync(join(tmpdir(), 'src-layers-'));
  roots.push(root);
  for (const entry of entries) {
    if (entry.endsWith('/')) mkdirSync(join(root, 'src', entry), { recursive: true });
    else {
      mkdirSync(join(root, 'src'), { recursive: true });
      writeFileSync(join(root, 'src', entry), 'export {};\n');
    }
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('checkSrcLayers (ADR-0030)', () => {
  it('6 つの層だけなら問題なし', () => {
    expect(checkSrcLayers(makeRoot(ALL))).toEqual([]);
  });

  it('欠けた層を指摘する（6 つ全部がそろう）', () => {
    expect(checkSrcLayers(makeRoot(['shared/', '_app/', '_pages/']))).toEqual([
      'src/widgets: missing FSD layer',
      'src/features: missing FSD layer',
      'src/entities: missing FSD layer',
    ]);
  });

  it('層の名前のファイルは、層の代わりにならない', () => {
    expect(checkSrcLayers(makeRoot([...ALL.filter((l) => l !== 'widgets/'), 'widgets']))).toEqual([
      'src/widgets: only the six FSD layers may sit directly under src/ (_app, _pages, widgets, features, entities, shared)',
      'src/widgets: missing FSD layer',
    ]);
  });

  it('層でないフォルダを指摘する', () => {
    expect(checkSrcLayers(makeRoot([...ALL, 'components/']))).toEqual([
      'src/components: only the six FSD layers may sit directly under src/ (_app, _pages, widgets, features, entities, shared)',
    ]);
  });

  it('層の打ち間違いを指摘する', () => {
    expect(checkSrcLayers(makeRoot([...ALL, 'entites/']))).toHaveLength(1);
  });

  it('src/ の直下のファイルを指摘する', () => {
    expect(checkSrcLayers(makeRoot([...ALL, 'index.ts']))).toEqual([
      'src/index.ts: only the six FSD layers may sit directly under src/ (_app, _pages, widgets, features, entities, shared)',
    ]);
  });

  it('src/ が無ければ指摘する', () => {
    const root = mkdtempSync(join(tmpdir(), 'src-layers-'));
    roots.push(root);
    expect(checkSrcLayers(root)).toEqual(['src/: does not exist']);
  });
});

describe('main', () => {
  it('問題が無ければ 0 を返し、通ったと書く', () => {
    const log = { log: vi.fn(), error: vi.fn() };
    expect(main(['--root', makeRoot(ALL)], log)).toBe(0);
    expect(log.log).toHaveBeenCalledWith('src layers check passed');
  });

  it('問題があれば 1 を返し、全部を書く', () => {
    const log = { log: vi.fn(), error: vi.fn() };
    expect(main(['--root', makeRoot([...ALL, 'components/', 'utils/'])], log)).toBe(1);
    expect(log.error).toHaveBeenCalledTimes(3);
  });

  it('--root が無ければ、このリポジトリを確かめる', () => {
    const log = { log: vi.fn(), error: vi.fn() };
    expect(main([], log)).toBe(0);
  });
});

describe('scripts/check-src-layers.mjs', () => {
  it('コマンドとして動かすと、終了コードを設定する', async () => {
    const argv = process.argv;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    process.argv = ['node', 'check-src-layers.mjs'];
    try {
      await import('./check-src-layers.mjs');
      expect(process.exitCode).toBe(0);
    } finally {
      process.argv = argv;
      process.exitCode = undefined;
    }
  });
});
