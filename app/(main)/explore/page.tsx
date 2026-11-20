import { Suspense } from 'react';
import { ExplorePage } from '@/_pages/explore';
import { loadExplorePage } from '@/_pages/explore/index.server';

async function Explore() {
  return <ExplorePage {...await loadExplorePage()} />;
}

export default function Page() {
  return (
    <Suspense>
      <Explore />
    </Suspense>
  );
}
