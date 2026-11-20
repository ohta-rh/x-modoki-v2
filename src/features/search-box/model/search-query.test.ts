import { describe, expect, it } from 'vitest';
import { MAX_QUERY_LENGTH, searchFilter, searchQuery } from './search-query';

describe('searchQuery（#27、#66）', () => {
  // FR-SEARCH-01: 本文の検索
  it('NFD の語は、保存した本文と同じ NFC にそろえる（濁点を分けて書いた「が」も「が」で探す）', () => {
    expect(searchQuery('がテスト')).toBe('がテスト');
    expect(searchQuery('é')).toBe('é');
  });

  it('前後の空白を除き、1〜100 文字。100 文字は NFC にそろえたあとで数える', () => {
    expect(searchQuery('  猫  ')).toBe('猫');
    expect(searchQuery('   ')).toBeNull();
    expect(searchQuery(null)).toBeNull();
    // 100 composed characters written decomposed are 200 code units: still searchable.
    expect(searchQuery('が'.repeat(MAX_QUERY_LENGTH))).toBe('が'.repeat(MAX_QUERY_LENGTH));
    expect(searchQuery('が'.repeat(MAX_QUERY_LENGTH + 1))).toBeNull();
  });

  it('U+0000 は除く（PostgreSQL が受け付けず、検索の画面が誤りになっていた、#89）', () => {
    expect(searchQuery('a\u0000b')).toBe('ab');
    expect(searchQuery('\u0000')).toBeNull();
  });

  it('f は live・user・media だけを読み、ほかは「話題」', () => {
    expect(['live', 'user', 'media', 'x', null].map(searchFilter)).toEqual([
      'live',
      'user',
      'media',
      'top',
      'top',
    ]);
  });
});
