import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fillEnv, main } from './lib/fill-env.mjs';

const dirs = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function file(content) {
  const dir = mkdtempSync(join(tmpdir(), 'fill-env-'));
  dirs.push(dir);
  const path = join(dir, '.env.local');
  writeFileSync(path, content);
  return path;
}

describe('fillEnv', () => {
  it('空の値だけを埋め、どれを埋めたかを返す', () => {
    const { text, filled } = fillEnv('# c\nA=\nB=kept\nC=\n', { A: '1', B: '2', C: '3' });
    expect(text).toBe('# c\nA=1\nB=kept\nC=3\n');
    expect(filled).toEqual(['A', 'C']);
  });

  it('既に値がある鍵は上書きしない（流し直しても秘密の値が変わらない）', () => {
    expect(fillEnv('SECRET=old\n', { SECRET: 'new' })).toEqual({
      text: 'SECRET=old\n',
      filled: [],
    });
  });

  it('ファイルに無い鍵は足さない', () => {
    expect(fillEnv('A=\n', { Z: '9' })).toEqual({ text: 'A=\n', filled: [] });
  });

  it('上書きを指定した鍵は、値があっても置き換える（Garage の鍵を作り直したとき）', () => {
    const { text, filled } = fillEnv('S3_ID=old\nKEEP=x\n', { S3_ID: 'new' }, ['S3_ID']);
    expect(text).toBe('S3_ID=new\nKEEP=x\n');
    expect(filled).toEqual(['S3_ID']);
  });

  it('名前が前に一致するだけの鍵には触れない', () => {
    expect(fillEnv('AB=\nA=\n', { A: '1' }).text).toBe('AB=\nA=1\n');
  });
});

describe('main', () => {
  const log = () => ({ log: vi.fn(), error: vi.fn() });

  it('ファイルを書き換え、埋めた鍵の名前だけを書く（値は書かない）', () => {
    const path = file('A=\nB=x\n');
    const l = log();
    expect(main([path, 'A=secret-value', 'B=y'], l)).toBe(0);
    expect(readFileSync(path, 'utf8')).toBe('A=secret-value\nB=x\n');
    expect(l.log).toHaveBeenCalledWith('fill-env: filled A');
    expect(JSON.stringify(l.log.mock.calls)).not.toContain('secret-value');
  });

  it('値の中の = を保つ', () => {
    const path = file('URL=\n');
    main([path, 'URL=http://x/?a=1'], log());
    expect(readFileSync(path, 'utf8')).toBe('URL=http://x/?a=1\n');
  });

  it('KEY:=VALUE は、値があっても上書きする', () => {
    const path = file('S3_ID=old\nA=1\n');
    main([path, 'S3_ID:=new', 'A=2'], log());
    expect(readFileSync(path, 'utf8')).toBe('S3_ID=new\nA=1\n');
  });

  it('埋めるものが無ければ、そう書く', () => {
    const l = log();
    expect(main([file('A=1\n'), 'A=2'], l)).toBe(0);
    expect(l.log).toHaveBeenCalledWith('fill-env: nothing to fill');
  });

  it('引数が足りなければ、使い方を書いて 2', () => {
    const l = log();
    expect(main([], l)).toBe(2);
    expect(l.error).toHaveBeenCalledWith('usage: fill-env.mjs <file> KEY=VALUE|KEY:=VALUE ...');
  });

  it('KEY=VALUE の形でない引数を拒む', () => {
    const l = log();
    expect(main([file('A=\n'), 'oops'], l)).toBe(2);
  });
});

describe('scripts/fill-env.mjs', () => {
  it('コマンドとして動かすと、終了コードを設定する', async () => {
    const argv = process.argv;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.argv = ['node', 'fill-env.mjs'];
    try {
      await import('./fill-env.mjs');
      expect(process.exitCode).toBe(2);
    } finally {
      process.argv = argv;
      process.exitCode = undefined;
    }
  });
});
