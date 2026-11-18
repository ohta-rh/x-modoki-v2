import type { ReactNode } from 'react';
import { Logo } from '@/shared/ui/logo';
import { SiteFooter } from '@/shared/ui/site-footer';

/** A centred card with the logo, for screens outside the three-column shell (routing.md 1). */
export function CenteredCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center">
      <main className="mt-8 flex w-full max-w-[600px] flex-col gap-8 rounded-card px-8 py-10 sm:border sm:border-line">
        <Logo className="mx-auto size-10 text-brand" />
        <h1 className="text-[31px] font-extrabold">{title}</h1>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
