'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

/** One QueryClient per browser tab; lists stay fresh for 30 seconds (ADR-0011). */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
