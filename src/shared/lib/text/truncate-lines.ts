/** Lines a post shows in a list before 「さらに表示」 (#28). */
const MAX_LINES = 8;

/**
 * A post's text for a list (ui-ux.md 5): the first 8 lines. A post is at most 280 weighted
 * characters, so only line breaks make it long.
 */
export function truncateLines(text: string): { text: string; truncated: boolean } {
  const lines = text.split('\n');
  return lines.length <= MAX_LINES
    ? { text, truncated: false }
    : { text: lines.slice(0, MAX_LINES).join('\n'), truncated: true };
}
