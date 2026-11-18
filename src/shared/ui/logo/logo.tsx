import { cn } from '@/shared/lib/cn';

/** The app's own mark: a speech bubble with an "m" (ADR-0009: never the X logo). Same as app/icon.svg. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn('size-8', className)}>
      <path
        fill="currentColor"
        d="M12 6h40a8 8 0 0 1 8 8v26a8 8 0 0 1-8 8H28l-12 10v-10h-4a8 8 0 0 1-8-8V14a8 8 0 0 1 8-8z"
      />
      <path
        fill="var(--bg, #fff)"
        d="M18 36V20h5l1 2a7 7 0 0 1 10 0 7 7 0 0 1 12 5v9h-6v-8a2 2 0 0 0-4 0v8h-6v-8a2 2 0 0 0-4 0v8z"
      />
    </svg>
  );
}
