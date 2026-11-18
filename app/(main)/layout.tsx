import type { ReactNode } from 'react';
import { MainLayout } from '@/_pages/main-layout';

export default function Layout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return <MainLayout modal={modal}>{children}</MainLayout>;
}
