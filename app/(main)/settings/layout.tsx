import type { ReactNode } from 'react';
import { SettingsLayout } from '@/_pages/settings';

export default function Layout({ children }: { children: ReactNode }) {
  return <SettingsLayout>{children}</SettingsLayout>;
}
