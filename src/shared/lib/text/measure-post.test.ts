import { describe, expect, it } from 'vitest';
import { measurePost } from './measure-post';

describe('measurePost（ui-ux.md の 5 節、FR-POST）', () => {
  it('ラテン文字は 1、上限は 280', () => {
    expect(measurePost('a'.repeat(280))).toEqual({ weighted: 280, remaining: 0, postable: true });
    expect(measurePost('a'.repeat(281))).toEqual({ weighted: 281, remaining: -1, postable: false });
  });

  it('日本語は 2 なので、実質 140 文字', () => {
    expect(measurePost('あ'.repeat(140)).postable).toBe(true);
    expect(measurePost('あ'.repeat(141))).toEqual({
      weighted: 282,
      remaining: -2,
      postable: false,
    });
  });

  it('絵文字は 2', () => {
    expect(measurePost('😀').weighted).toBe(2);
  });

  it('URL は長さによらず 23', () => {
    expect(measurePost(`https://example.com/${'a'.repeat(100)}`).weighted).toBe(23);
  });

  it('NFC にそろえてから数える（合成済みと分解した濁点が同じ）', () => {
    expect(measurePost('が').weighted).toBe(measurePost('が').weighted);
  });

  it.each(['', '   ', '\n\n'])('空や空白だけの本文 %j は投稿できない', (text) => {
    expect(measurePost(text).postable).toBe(false);
  });
});
