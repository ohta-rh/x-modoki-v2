import { describe, expect, it } from 'vitest';
import { tokenizePost } from './tokenize-post';

describe('tokenizePost（NFR-SEC-06、T-05・T-06）', () => {
  it('URL・@ユーザー名・#ハッシュタグを、行き先つきの部品に分ける', () => {
    expect(tokenizePost('見て https://example.com/a #テスト @Taro です')).toEqual([
      { type: 'text', value: '見て ' },
      { type: 'url', value: 'https://example.com/a', href: 'https://example.com/a' },
      { type: 'text', value: ' ' },
      { type: 'hashtag', value: '#テスト', href: '/search?q=%23%E3%83%86%E3%82%B9%E3%83%88' },
      { type: 'text', value: ' ' },
      { type: 'mention', value: '@Taro', href: '/taro' },
      { type: 'text', value: ' です' },
    ]);
  });

  it('http と https の URL だけをリンクにする（スキームの無いもの、javascript: は文字のまま）', () => {
    expect(tokenizePost('example.com javascript:alert(1)')).toEqual([
      { type: 'text', value: 'example.com javascript:alert(1)' },
    ]);
  });

  it('HTML は文字のまま 1 つの部品にする', () => {
    expect(tokenizePost('<script>alert(1)</script>')).toEqual([
      { type: 'text', value: '<script>alert(1)</script>' },
    ]);
  });

  it('空の本文は空の並び', () => {
    expect(tokenizePost('')).toEqual([]);
  });
});
