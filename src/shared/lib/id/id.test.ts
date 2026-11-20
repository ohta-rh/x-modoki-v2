import { describe, expect, it, vi } from 'vitest';
import { newId, parseId, toIdString } from './id.ts';

describe('newId (ADR-0016)', () => {
  it('あとに作った ID のほうが大きい', () => {
    const first = newId({ now: Date.UTC(2026, 10, 18), random: 0x3fffff });
    const second = newId({ now: Date.UTC(2026, 10, 18) + 1, random: 0 });
    expect(second > first).toBe(true);
  });

  it('上の 41 bit が 2026-01-01T00:00:00Z からのミリ秒、下の 22 bit が乱数', () => {
    const id = newId({ now: Date.UTC(2026, 0, 1) + 5, random: 7 });
    expect(id >> 22n).toBe(5n);
    expect(id & 0x3fffffn).toBe(7n);
  });

  it('乱数を渡さなければ crypto.getRandomValues の 22 bit を使う', () => {
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      (array as Uint32Array)[0] = 0xffffffff;
      return array;
    });
    expect(newId({ now: Date.UTC(2026, 0, 1) }) & 0x3fffffn).toBe(0x3fffffn);
  });

  it('時刻を渡さなければ Date.now() を使う', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(Date.UTC(2026, 0, 1, 0, 0, 1));
      expect(newId({ random: 0 })).toBe(1000n << 22n);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('toIdString と parseId (ADR-0016)', () => {
  it('ID を数字の文字列にし、元に戻せる', () => {
    const id = newId();
    expect(toIdString(id)).toMatch(/^[1-9]\d{0,18}$/);
    expect(parseId(toIdString(id))).toBe(id);
  });

  it('いちばん大きい 19 桁（2^63 - 1）を受け付ける', () => {
    expect(parseId('9223372036854775807')).toBe(9223372036854775807n);
  });

  it.each([
    ['桁あふれ（2^63）', '9223372036854775808'],
    ['20 桁', '12345678901234567890'],
    ['空', ''],
    ['数字でない', 'abc'],
    ['負の数', '-1'],
    ['0 で始まる', '01'],
    ['0', '0'],
    ['小数', '1.5'],
    ['前後の空白', ' 1'],
  ])('%s は null', (_, text) => {
    expect(parseId(text)).toBeNull();
  });
});
