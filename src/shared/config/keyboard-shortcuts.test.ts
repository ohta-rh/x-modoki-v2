import { describe, expect, it } from 'vitest';
import { KEYBOARD_SHORTCUTS, resolveShortcut } from './keyboard-shortcuts';

const key = (
  k: string,
  extra: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {},
) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...extra,
});

describe('resolveShortcut（#29、ui-ux.md の 10 節）', () => {
  it('1 つのキーの動きを返す', () => {
    expect(resolveShortcut(key('n'), null)).toEqual({ action: 'compose', pending: null });
    expect(resolveShortcut(key('j'), null)).toEqual({ action: 'next', pending: null });
    expect(resolveShortcut(key('k'), null)).toEqual({ action: 'previous', pending: null });
    expect(resolveShortcut(key('l'), null)).toEqual({ action: 'like', pending: null });
    expect(resolveShortcut(key('r'), null)).toEqual({ action: 'reply', pending: null });
    expect(resolveShortcut(key('t'), null)).toEqual({ action: 'repost', pending: null });
    expect(resolveShortcut(key('o'), null)).toEqual({ action: 'open', pending: null });
    expect(resolveShortcut(key('?'), null)).toEqual({ action: 'help', pending: null });
  });

  it('g のあとの h / n / p は移動。g だけでは何もせず次のキーを待つ。続かなければ忘れる', () => {
    expect(resolveShortcut(key('g'), null)).toEqual({ action: null, pending: 'g' });
    expect(resolveShortcut(key('h'), 'g')).toEqual({ action: 'go-home', pending: null });
    expect(resolveShortcut(key('n'), 'g')).toEqual({ action: 'go-notifications', pending: null });
    expect(resolveShortcut(key('p'), 'g')).toEqual({ action: 'go-profile', pending: null });
    expect(resolveShortcut(key('x'), 'g')).toEqual({ action: null, pending: null });
  });

  it('Ctrl・Cmd・Alt と一緒のキーと、表に無いキーは何もしない', () => {
    expect(resolveShortcut(key('n', { ctrlKey: true }), null)).toEqual({
      action: null,
      pending: null,
    });
    expect(resolveShortcut(key('l', { metaKey: true }), null)).toEqual({
      action: null,
      pending: null,
    });
    expect(resolveShortcut(key('j', { altKey: true }), null)).toEqual({
      action: null,
      pending: null,
    });
    expect(resolveShortcut(key('x'), null)).toEqual({ action: null, pending: null });
  });

  it('一覧（?）に出す表は、全部のキーに日本語の説明がある', () => {
    expect(KEYBOARD_SHORTCUTS.map((shortcut) => shortcut.keys.join(' '))).toEqual([
      'n',
      'l',
      'j',
      'k',
      'r',
      'o',
      't',
      'g h',
      'g n',
      'g p',
      '?',
      'Esc',
    ]);
    expect(KEYBOARD_SHORTCUTS.every((shortcut) => shortcut.label.length > 0)).toBe(true);
  });
});
