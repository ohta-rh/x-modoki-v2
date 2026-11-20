import { describe, expect, it } from 'vitest';
import { likePattern } from './like-pattern';

describe('likePattern（#27）', () => {
  it('前後を % で囲み、% と _ と \\ を文字として扱う', () => {
    expect(likePattern('猫')).toBe('%猫%');
    expect(likePattern('100%')).toBe('%100\\%%');
    expect(likePattern('a_b')).toBe('%a\\_b%');
    expect(likePattern('c:\\x')).toBe('%c:\\\\x%');
  });
});
