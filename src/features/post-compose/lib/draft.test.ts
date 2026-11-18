// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, readDraft, saveDraft, subscribeDraft } from './draft';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('下書き（#28、その端末の中だけ）', () => {
  it('保存した本文を読み出し、消すと空に戻る', () => {
    expect(readDraft()).toBe('');
    saveDraft('書きかけ');
    expect(readDraft()).toBe('書きかけ');
    clearDraft();
    expect(readDraft()).toBe('');
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
    expect(() => saveDraft('書きかけ')).not.toThrow();
    expect(readDraft()).toBe('');
    expect(() => clearDraft()).not.toThrow();
  });

  it('このタブでの保存と消去を、購読している人に知らせ、やめれば知らせない。ほかのタブの変更は知らせない（書きかけを消さない、レビュー 1）', () => {
    const heard = vi.fn();
    const stop = subscribeDraft(heard);
    saveDraft('a');
    clearDraft();
    window.dispatchEvent(new StorageEvent('storage', { key: 'x-modoki:compose-draft' }));
    expect(heard).toHaveBeenCalledTimes(2);
    stop();
    saveDraft('b');
    expect(heard).toHaveBeenCalledTimes(2);
  });
});
