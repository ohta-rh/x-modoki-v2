import twitterText from 'twitter-text';
import type { PostLink } from '@/shared/lib/text';

const WEB_URL = /^https?:\/\//i;

/**
 * The links in a post (NFR-SEC-06): only URLs written with http:// or https:// become links;
 * everything else, HTML included, stays text for React to escape.
 */
export function findLinks(text: string): PostLink[] {
  const links: PostLink[] = [];
  // URLs without a scheme are extracted too, then left as text by the http(s) check below.
  for (const entity of twitterText.extractEntitiesWithIndices(text)) {
    const [start, end] = entity.indices;
    if ('url' in entity && WEB_URL.test(entity.url)) {
      links.push({ type: 'url', start, end, href: entity.url });
    } else if ('hashtag' in entity) {
      const href = `/search?q=${encodeURIComponent(`#${entity.hashtag}`)}`;
      links.push({ type: 'hashtag', start, end, href });
    } else if ('screenName' in entity) {
      links.push({ type: 'mention', start, end, href: `/${entity.screenName.toLowerCase()}` });
    }
  }
  return links;
}
