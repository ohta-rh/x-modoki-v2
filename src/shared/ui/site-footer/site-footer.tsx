import { cn } from '@/shared/lib/cn';

/** FR-SHELL-09: every screen says the app is unrelated to X Corp. */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('px-4 py-3 text-[13px] text-text-muted', className)}>
      <p>X Corp. とは関係の無い学習用のアプリ</p>
    </footer>
  );
}
