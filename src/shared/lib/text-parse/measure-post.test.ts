import { describe, expect, it } from 'vitest';
import { measurePost } from './measure-post';

describe('measurePost（ui-ux.md の 5 節、FR-POST）', () => {
  it('ラテン文字は 1、上限は 280', () => {
    expect(measurePost('a'.repeat(280))).toEqual({ weighted: 280, remaining: 0, postable: true });
    expect(measurePost('a'.repeat(281))).toEqual({ weighted: 281, remaining: -1, postable: false });
  });

  // FR-POST-02: 文字数の上限
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

  // FR-POST-03: 空の本文
  it.each(['', '   ', '\n\n'])('空や空白だけの本文 %j は投稿できない', (text) => {
    expect(measurePost(text).postable).toBe(false);
  });

  it('U+0000 は保存しないので、重みに数えない（#89）', () => {
    expect(measurePost('ab\u0000c').weighted).toBe(measurePost('abc').weighted);
  });

  it('前後の空白と改行は、保存しないので重みに数えない（#67）', () => {
    expect(measurePost('\n\n  abc  \n\n').weighted).toBe(3);
    expect(measurePost(' '.repeat(10) + 'a'.repeat(280)).postable).toBe(true);
  });
});
