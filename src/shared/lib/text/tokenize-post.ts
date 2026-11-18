import twitterText from 'twitter-text';

export type PostToken =
  | { type: 'text'; value: string }
  | { type: 'url' | 'hashtag' | 'mention'; value: string; href: string };

const WEB_URL = /^https?:\/\//i;

/**
 * Splits a post into plain text and links (NFR-SEC-06). Only URLs written with http:// or https://
 * become links; everything else, HTML included, stays text for React to escape.
 */
export function tokenizePost(text: string): PostToken[] {
  const tokens: PostToken[] = [];
  let at = 0;
  const pushText = (end: number) => {
    if (end > at) tokens.push({ type: 'text', value: text.slice(at, end) });
  };
  // URLs without a scheme are extracted too, then left as text by the http(s) check below.
  for (const entity of twitterText.extractEntitiesWithIndices(text)) {
    const [start, end] = entity.indices;
    const value = text.slice(start, end);
    let token: PostToken | null = null;
    if ('url' in entity && WEB_URL.test(entity.url)) {
      token = { type: 'url', value, href: entity.url };
    } else if ('hashtag' in entity) {
      token = {
        type: 'hashtag',
        value,
        href: `/search?q=${encodeURIComponent(`#${entity.hashtag}`)}`,
      };
    } else if ('screenName' in entity) {
      token = { type: 'mention', value, href: `/${entity.screenName.toLowerCase()}` };
    }
    if (!token) continue;
    pushText(start);
    tokens.push(token);
    at = end;
  }
  pushText(text.length);
  return tokens;
}
