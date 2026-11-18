import { describe, expect, it } from 'vitest';
import { truncateLines } from './truncate-lines';

describe('truncateLines（#28、タイムラインの長い本文）', () => {
  it('8 行までは、そのまま', () => {
    const text = Array.from({ length: 8 }, (_, i) => `行 ${i + 1}`).join('\n');
    expect(truncateLines(text)).toEqual({ text, truncated: false });
  });

  it('9 行からは、最初の 8 行に切り詰める', () => {
    const text = Array.from({ length: 12 }, (_, i) => `行 ${i + 1}`).join('\n');
    expect(truncateLines(text)).toEqual({
      text: Array.from({ length: 8 }, (_, i) => `行 ${i + 1}`).join('\n'),
      truncated: true,
    });
  });
});
