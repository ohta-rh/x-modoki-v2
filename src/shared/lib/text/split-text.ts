import type { PostLink, PostToken } from './post-link';

/** A post split into plain text and the links found for it on the server (#32). */
export function splitText(text: string, links: PostLink[]): PostToken[] {
  const tokens: PostToken[] = [];
  let at = 0;
  for (const { type, start, end, href } of links) {
    if (start > at) tokens.push({ type: 'text', value: text.slice(at, start) });
    tokens.push({ type, value: text.slice(start, end), href });
    at = end;
  }
  if (text.length > at) tokens.push({ type: 'text', value: text.slice(at) });
  return tokens;
}
