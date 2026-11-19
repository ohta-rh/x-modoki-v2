import { describe, expect, it } from 'vitest';
import { cleanText } from './clean-text';

describe('cleanText（人が入れた文字を保存・検索の前に整える、#66・#67・#89）', () => {
  it('U+0000 を取り除き（PostgreSQL の text が受け付けない）、NFC にそろえ、前後の空白と改行を削る', () => {
    expect(cleanText('  が\u0000な\n\n ')).toBe('がな');
    expect(cleanText('\u0000')).toBe('');
  });

  it('途中の空白・改行と、ほかの文字はそのまま', () => {
    expect(cleanText('前の行\n  次の行\u0001')).toBe('前の行\n  次の行\u0001');
  });
});
