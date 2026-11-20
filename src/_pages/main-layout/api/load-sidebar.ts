import 'server-only';
import { connection } from 'next/server';
import type { Trend } from '@/entities/hashtag';
import { getTrends } from '@/entities/hashtag/index.server';
import type { FollowUser } from '@/entities/user';
import { getSuggestions } from '@/entities/user/index.server';

export type SidebarData = { trends: Trend[]; suggestions: FollowUser[] };

/** The right sidebar's trends and who to follow (#27), read together. */
export async function loadSidebar(): Promise<SidebarData> {
  await connection(); // read per request (ADR-0048), never while prerendering
  const [trends, suggestions] = await Promise.all([getTrends(), getSuggestions()]);
  return { trends, suggestions };
}
