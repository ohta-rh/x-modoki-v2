import 'server-only';
import { connection } from 'next/server';
import type { Trend } from '@/entities/hashtag';
import { getTrends } from '@/entities/hashtag/index.server';

export type ExplorePageData = { trends: Trend[] };

/** /explore (#27): the trends under the search box. */
export async function loadExplorePage(): Promise<ExplorePageData> {
  await connection(); // read per request (ADR-0048), never while prerendering
  return { trends: await getTrends() };
}
