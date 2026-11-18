import type { Trend } from '@/entities/hashtag';
import { SearchBox } from '@/features/search-box';
import { Trends } from '@/widgets/trends';

/** /explore (#27): the search box, and the trends under it. */
export function ExplorePage({ trends }: { trends: Trend[] }) {
  return (
    <div className="flex flex-col gap-4 px-4 py-2">
      <SearchBox />
      <Trends trends={trends} />
    </div>
  );
}
