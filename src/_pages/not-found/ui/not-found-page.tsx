import Link from 'next/link';

/**
 * The 404 inside the main layout (#20). Replaces Next.js's default screen, whose own styles paint
 * the body black in a dark OS whatever the app's theme.
 */
export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-5 px-8 py-16 text-center">
      <h1 className="text-title font-bold">このページは存在しません。</h1>
      <p className="text-body text-text-muted">他のページを検索してみましょう。</p>
      <Link
        href="/explore"
        className="rounded-full bg-brand-fill px-4 py-2 text-body font-bold text-on-brand hover:brightness-90"
      >
        検索
      </Link>
    </div>
  );
}
