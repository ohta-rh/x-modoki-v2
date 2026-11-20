import { Suspense } from 'react';
import { AccountPage } from '@/_pages/settings';
import { loadAccount } from '@/_pages/settings/index.server';

async function Account() {
  return <AccountPage {...await loadAccount()} />;
}

export default function Page() {
  return (
    <Suspense>
      <Account />
    </Suspense>
  );
}
