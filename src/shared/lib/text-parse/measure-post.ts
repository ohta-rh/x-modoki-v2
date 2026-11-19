import twitterText from 'twitter-text';
import { MAX_WEIGHTED_LENGTH } from '@/shared/lib/text';

export type PostMeasure = { weighted: number; remaining: number; postable: boolean };

/**
 * Counts a post the way X does (docs/architecture/ui-ux.md 5): twitter-text's weighted length
 * after NFC normalisation — Latin 1, CJK and emoji 2, any URL 23 — against a limit of 280.
 * The browser and the server both use this, so they always agree.
 */
export function measurePost(text: string): PostMeasure {
  const normalized = text.normalize('NFC');
  const { weightedLength } = twitterText.parseTweet(normalized);
  const remaining = MAX_WEIGHTED_LENGTH - weightedLength;
  return {
    weighted: weightedLength,
    remaining,
    postable: normalized.trim().length > 0 && remaining >= 0,
  };
}
