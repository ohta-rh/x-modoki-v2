import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DisplayScript, QueryProvider } from '@/_app/entrypoint';
import '@/_app/styles/global.css';

export const metadata: Metadata = {
  title: 'x-modoki',
  description: 'X Corp. とは関係の無い学習用のアプリ',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The head script sets the saved theme and accent before the first paint (ADR-0051), so the
    // attributes on the client differ from these.
    <html lang="ja" data-theme="light" suppressHydrationWarning>
      <head>
        <DisplayScript />
      </head>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
