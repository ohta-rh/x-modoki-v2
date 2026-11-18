import { describe, expect, it } from 'vitest';
import { absoluteTime, calendarDate, compactCount, joinedMonth, relativeTime } from './format';

const now = new Date('2026-11-18T12:00:00+09:00');
const ago = (ms: number) => new Date(now.getTime() - ms);

describe('relativeTime（ui-ux.md の 5 節、NFR-I18N-02）', () => {
  // FR-VIEW-07: 相対の時刻
  // NFR-I18N-02: 時刻は日本の形（`N秒`・`N分`・`N時間`・`M月D日`・`YYYY年M月D日`）、数は日本の省略（`1.2万`・`3.4億`）で出す
  it.each([
    [0, '0秒'],
    [59_000, '59秒'],
    [60_000, '1分'],
    [59 * 60_000, '59分'],
    [60 * 60_000, '1時間'],
    [23 * 3_600_000, '23時間'],
  ])('%d ミリ秒前は %s', (ms, expected) => {
    expect(relativeTime(ago(ms), now)).toBe(expected);
  });

  it('24 時間より前で同じ年なら M月D日（日本時間）', () => {
    expect(relativeTime(new Date('2026-11-17T08:00:00+09:00'), now)).toBe('11月17日');
    expect(relativeTime(new Date('2026-01-01T00:30:00+09:00'), now)).toBe('1月1日');
  });

  it('前の年より前なら YYYY年M月D日', () => {
    expect(relativeTime(new Date('2025-12-31T23:00:00+09:00'), now)).toBe('2025年12月31日');
  });

  it('未来の時刻（時計のずれ）は 0秒', () => {
    expect(relativeTime(new Date(now.getTime() + 5_000), now)).toBe('0秒');
  });
});

describe('compactCount（ui-ux.md の 5 節）', () => {
  // FR-VIEW-08: 数の省略
  it.each([
    [0, '0'],
    [999, '999'],
    [9_999, '9,999'],
    [10_000, '1万'],
    [12_345, '1.2万'],
    [99_999_999, '9999.9万'],
    [100_000_000, '1億'],
    [340_000_000, '3.4億'],
  ])('%d は %s', (n, expected) => {
    expect(compactCount(n)).toBe(expected);
  });
});

describe('absoluteTime（詳細の画面の時刻、日本時間）', () => {
  it.each([
    ['2026-11-18T06:04:00Z', '午後3:04 · 2026年11月18日'],
    ['2026-11-17T15:30:00Z', '午前0:30 · 2026年11月18日'],
    ['2026-11-18T03:00:00Z', '午後0:00 · 2026年11月18日'],
    ['2026-01-01T02:09:00Z', '午前11:09 · 2026年1月1日'],
  ])('%s は %s', (iso, expected) => {
    expect(absoluteTime(new Date(iso))).toBe(expected);
  });
});

describe('joinedMonth（#23）', () => {
  it('日本時間の年と月で「YYYY年M月から利用しています」', () => {
    expect(joinedMonth(new Date('2025-04-01T00:00:00Z'))).toBe('2025年4月から利用しています');
    // 2025-03-31 16:00 UTC is already April in Tokyo.
    expect(joinedMonth(new Date('2025-03-31T16:00:00Z'))).toBe('2025年4月から利用しています');
  });
});

describe('calendarDate（#29、アカウントの登録した日）', () => {
  it('日本の時刻で「2026年11月19日」', () => {
    expect(calendarDate(new Date('2026-11-18T15:30:00Z'))).toBe('2026年11月19日');
    expect(calendarDate(new Date('2026-01-05T00:00:00+09:00'))).toBe('2026年1月5日');
  });
});
