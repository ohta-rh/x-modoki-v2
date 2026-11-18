import { type ReactNode, Suspense } from 'react';
import { MainLayout } from '@/_pages/main-layout';
import { loadViewer } from '@/_pages/main-layout/index.server';

type Props = { children: ReactNode; modal: ReactNode };

async function SignedIn({ children, modal }: Props) {
  const viewer = await loadViewer();
  return (
    <MainLayout viewer={viewer} modal={modal}>
      {children}
    </MainLayout>
  );
}

export default function Layout({ children, modal }: Props) {
  return (
    <Suspense>
      <SignedIn modal={modal}>{children}</SignedIn>
    </Suspense>
  );
}
