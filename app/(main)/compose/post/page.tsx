import { Suspense } from 'react';
import { ComposePage } from '@/_pages/compose';
import { loadCompose } from '@/_pages/compose/index.server';

async function Compose() {
  return <ComposePage {...await loadCompose()} />;
}

export default function Page() {
  return (
    <Suspense>
      <Compose />
    </Suspense>
  );
}
