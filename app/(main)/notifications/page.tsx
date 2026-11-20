import { Suspense } from 'react';
import { NotificationsPage } from '@/_pages/notifications';
import { loadNotificationsPage } from '@/_pages/notifications/index.server';

async function Notifications() {
  return <NotificationsPage {...await loadNotificationsPage('all')} />;
}

export default function Page() {
  return (
    <Suspense>
      <Notifications />
    </Suspense>
  );
}
