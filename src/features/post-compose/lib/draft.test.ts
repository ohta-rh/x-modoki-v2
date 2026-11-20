// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, readDraft, saveDraft, subscribeDraft } from './draft';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('下書き（#28、その端末の中だけ）', () => {
  it('保存した本文を読み出し、消すと空に戻る', () => {
    expect(readDraft('hana')).toBe('');
    saveDraft('hana', '書きかけ');
    expect(readDraft('hana')).toBe('書きかけ');
    clearDraft('hana');
    expect(readDraft('hana')).toBe('');
  });

  it('localStorage が使えなくても（プライベートのウィンドウなど）投げずに空として振る舞う', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => saveDraft('hana', '書きかけ')).not.toThrow();
    expect(readDraft('hana')).toBe('');
    expect(() => clearDraft('hana')).not.toThrow();
  });

  it('このタブでの保存と消去を、購読している人に知らせ、やめれば知らせない。ほかのタブの変更は知らせない（書きかけを消さない、レビュー 1）', () => {
    const heard = vi.fn();
    const stop = subscribeDraft(heard);
    saveDraft('hana', 'a');
    clearDraft('hana');
    window.dispatchEvent(new StorageEvent('storage', { key: 'x-modoki:compose-draft' }));
    expect(heard).toHaveBeenCalledTimes(2);
    stop();
    saveDraft('hana', 'b');
    expect(heard).toHaveBeenCalledTimes(2);
  });

  it('下書きは人ごとに分けて置き、別の人には出ない。同じ人には次も出る（#79）', () => {
    saveDraft('hana', '花子の下書き');
    expect(readDraft('taro')).toBe('');
    saveDraft('taro', '太郎の下書き');
    expect(readDraft('hana')).toBe('花子の下書き');
    clearDraft('taro');
    expect(readDraft('hana')).toBe('花子の下書き');
  });

  it('前の形の、人を分けない下書きは、読むときに消して誰にも出さない（#79）', () => {
    window.localStorage.setItem('x-modoki:compose-draft', '前の人の下書き');
    expect(readDraft('hana')).toBe('');
    expect(window.localStorage.getItem('x-modoki:compose-draft')).toBeNull();
  });
});
