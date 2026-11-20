import type { Route } from 'next';
import Link from 'next/link';
import { useId } from 'react';
import type { Trend } from '@/entities/hashtag';

/** いまどうしてる？ (#27): the trending hashtags, each opening its search. */
export function Trends({
  trends,
  title = 'いまどうしてる？',
}: {
  trends: Trend[];
  /** The section's heading and name: /explore names its own apart from the sidebar's (#31). */
  title?: string;
}) {
  // /explore shows it twice (the page and the right sidebar): each heading needs its own id.
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-line">
      <h2 id={titleId} className="px-4 py-3 text-title font-extrabold">
        {title}
      </h2>
      {trends.length === 0 ? (
        <p className="px-4 pb-4 text-text-muted">トレンドはまだありません</p>
      ) : (
        <ul>
          {trends.map((trend) => (
            <li key={trend.tag}>
              <Link
                href={`/search?q=${encodeURIComponent(`#${trend.tag}`)}` as Route}
                // Not prefetched: a prefetch of /search?q=… was seen to stay open (#27), keeping
                // the page from going idle; a search result is not worth reading ahead.
                prefetch={false}
                className="block px-4 py-3 hover:bg-hover"
              >
                <span className="block font-bold break-all">#{trend.tag}</span>
                <span className="block text-[13px] text-text-muted">{trend.count} 件のポスト</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
