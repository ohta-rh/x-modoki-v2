import 'server-only';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import type { NotificationPage } from '@/entities/notification';
import { getNotifications, type NotificationsTab } from '@/entities/notification/index.server';
import { LOGIN_PATH } from '@/shared/config';

export type NotificationsPageData = { tab: NotificationsTab; firstPage: NotificationPage };

/** /notifications and /notifications/mentions (#26): the first page, read on the server. */
export async function loadNotificationsPage(tab: NotificationsTab): Promise<NotificationsPageData> {
  await connection(); // read per request, never while prerendering
  const result = await getNotifications(tab, null);
  // No cursor is given, so the only refusal is a missing session.
  if (!result.ok) redirect(LOGIN_PATH);
  return { tab, firstPage: result.page };
}
