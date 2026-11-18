'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Toaster } from '@/shared/ui/kit';

/**
 * One QueryClient per browser tab; lists stay fresh for 30 seconds (ADR-0011). The toaster shows
 * what any component adds with `toast.add` (#21).
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <Toaster>{children}</Toaster>
    </QueryClientProvider>
  );
}
