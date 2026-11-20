import { Suspense } from 'react';
import { LandingPage } from '@/_pages/landing';
import { redirectIfSignedIn } from '@/_pages/landing/index.server';

async function Landing() {
  await redirectIfSignedIn();
  return <LandingPage />;
}

export default function Page() {
  return (
    <Suspense>
      <Landing />
    </Suspense>
  );
}
