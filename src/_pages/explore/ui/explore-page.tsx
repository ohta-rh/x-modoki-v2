import type { Trend } from '@/entities/hashtag';
import { SearchBox } from '@/features/search-box';
import { Trends } from '@/widgets/trends';

/** /explore (#27): the search box, and the trends under it. */
export function ExplorePage({ trends }: { trends: Trend[] }) {
  return (
    <div className="flex flex-col gap-4 px-4 py-2">
      {/* The screen's name for assistive technology; the box says it to the eye (#31). */}
      <h1 className="sr-only">話題を検索</h1>
      <SearchBox label="話題を検索" />
      <Trends trends={trends} title="トレンド" />
    </div>
  );
}
