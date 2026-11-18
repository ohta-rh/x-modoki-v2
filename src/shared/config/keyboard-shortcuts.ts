/** What a key does (#29, ui-ux.md 10). `Esc` is the dialogs' own and has no action here. */
export type ShortcutAction =
  | 'compose'
  | 'like'
  | 'next'
  | 'previous'
  | 'reply'
  | 'repost'
  | 'go-home'
  | 'go-notifications'
  | 'go-profile'
  | 'help';

type Shortcut = { keys: string[]; label: string; action: ShortcutAction | null };

/** The one table of keys: it drives both the keys and the list `?` shows. */
export const KEYBOARD_SHORTCUTS: readonly Shortcut[] = [
  { keys: ['n'], label: '新しいポスト', action: 'compose' },
  { keys: ['l'], label: 'いいね', action: 'like' },
  { keys: ['j'], label: '次のポスト', action: 'next' },
  { keys: ['k'], label: '前のポスト', action: 'previous' },
  { keys: ['r'], label: '返信', action: 'reply' },
  { keys: ['t'], label: 'リポスト', action: 'repost' },
  { keys: ['g', 'h'], label: 'ホーム', action: 'go-home' },
  { keys: ['g', 'n'], label: '通知', action: 'go-notifications' },
  { keys: ['g', 'p'], label: 'プロフィール', action: 'go-profile' },
  { keys: ['?'], label: 'キーボードショートカットを表示', action: 'help' },
  { keys: ['Esc'], label: 'モーダルを閉じる', action: null },
];

type KeyPress = { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean };

/**
 * The action of a key press, given the key pressed just before when it starts a pair (`g`).
 * Presses with Ctrl, Cmd or Alt belong to the browser.
 */
export function resolveShortcut(
  press: KeyPress,
  pending: string | null,
): { action: ShortcutAction | null; pending: string | null } {
  if (press.ctrlKey || press.metaKey || press.altKey) return { action: null, pending: null };
  const keys = pending === null ? [press.key] : [pending, press.key];
  const shortcut = KEYBOARD_SHORTCUTS.find((entry) => entry.keys.join(' ') === keys.join(' '));
  if (shortcut) return { action: shortcut.action, pending: null };
  const starts =
    pending === null &&
    KEYBOARD_SHORTCUTS.some((entry) => entry.keys.length > 1 && entry.keys[0] === press.key);
  return { action: null, pending: starts ? press.key : null };
}
