import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('条件つきのクラスをつなぎ、偽の値を落とす', () => {
    expect(cn('a', false && 'b', undefined, { c: true, d: false })).toBe('a c');
  });

  it('ぶつかる Tailwind のクラスは、あとのものを残す', () => {
    expect(cn('px-2 text-sm', 'px-4')).toBe('text-sm px-4');
  });
});
