import type { ReactNode } from 'react';

/**
 * The sticky, translucent 53px header of the main column (docs/architecture/ui-ux.md 2). Below 640px
 * its left holds the account avatar that AppShell lays over it when signed in (#85).
 */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex h-[53px] items-center border-b border-line bg-[var(--header-bg)] px-4 backdrop-blur-[12px] group-data-signed-in/shell:pl-14 sm:group-data-signed-in/shell:pl-4">
      <h1 className="min-w-0 truncate text-title font-extrabold">{title}</h1>
      {children}
    </header>
  );
}
