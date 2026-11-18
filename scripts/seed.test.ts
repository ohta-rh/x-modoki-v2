import { describe, expect, it, vi } from 'vitest';
import { seed } from './seed';

describe('seed', () => {
  it('入れるデータがまだ無いことを書いて 0 を返す（表は #16 で足す）', () => {
    const log = vi.fn();
    expect(seed(log)).toBe(0);
    expect(log).toHaveBeenCalledWith('seed: no seed data yet (tables arrive in #16)');
  });
});

describe('scripts/db-seed.ts', () => {
  it('コマンドとして動かすと、終了コードを設定する', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await import('./db-seed.ts');
      expect(process.exitCode).toBe(0);
    } finally {
      process.exitCode = undefined;
    }
  });
});
