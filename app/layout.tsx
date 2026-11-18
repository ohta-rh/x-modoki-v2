import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { QueryProvider } from '@/_app/entrypoint';
import '@/_app/styles/global.css';

export const metadata: Metadata = {
  title: 'x-modoki',
  description: 'X Corp. とは関係の無い学習用のアプリ',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
