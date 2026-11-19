import type { ReactNode } from 'react';

/** The sticky, translucent 53px header of the main column (docs/architecture/ui-ux.md 2). */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex h-[53px] items-center border-b border-line bg-[var(--header-bg)] px-4 backdrop-blur-[12px]">
      <h1 className="min-w-0 truncate text-title font-extrabold">{title}</h1>
      {children}
    </header>
  );
}
