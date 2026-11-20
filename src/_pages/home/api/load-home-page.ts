import 'server-only';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import type { PostPage, TimelineKind } from '@/entities/post';
import { getTimeline } from '@/entities/post/index.server';
import { LOGIN_PATH } from '@/shared/config';

export type HomePageData = { kind: TimelineKind; firstPage: PostPage; now: string };

/** /home: the first page of the chosen tab (おすすめ unless ?tab=following), read on the server. */
export async function loadHomePage(tab: string | string[] | undefined): Promise<HomePageData> {
  await connection(); // read per request, never while prerendering (#10 3.2)
  const kind: TimelineKind = tab === 'following' ? 'following' : 'for-you';
  const result = await getTimeline(kind, null);
  if (!result.ok) redirect(LOGIN_PATH);
  return { kind, firstPage: result.page, now: new Date().toISOString() };
}
