import Link from 'next/link';

/** /{username} for a user that does not exist (#23); like X, it offers search. */
export function ProfileNotFound() {
  return (
    <div className="flex flex-col items-center gap-5 px-8 py-16 text-center">
      <h1 className="text-title font-bold">このアカウントは存在しません</h1>
      <p className="text-body text-text-muted">別のアカウントを検索してみましょう。</p>
      <Link
        href="/explore"
        className="rounded-full bg-brand-fill px-4 py-2 text-body font-bold text-on-brand hover:brightness-90"
      >
        検索
      </Link>
    </div>
  );
}
