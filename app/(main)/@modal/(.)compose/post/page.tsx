import { Suspense } from 'react';
import { ComposeModal } from '@/_pages/compose';
import { loadCompose } from '@/_pages/compose/index.server';

async function Compose() {
  return <ComposeModal {...await loadCompose()} />;
}

export default function Page() {
  return (
    <Suspense>
      <Compose />
    </Suspense>
  );
}
