import { Suspense } from 'react';
import { DisplayPage } from '@/_pages/settings';
import { loadDisplay } from '@/_pages/settings/index.server';

async function Display() {
  return <DisplayPage {...await loadDisplay()} />;
}

export default function Page() {
  return (
    <Suspense>
      <Display />
    </Suspense>
  );
}
