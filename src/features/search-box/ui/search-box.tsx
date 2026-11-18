import { Search } from 'lucide-react';
import Form from 'next/form';
import { MAX_QUERY_LENGTH } from '../model/search-query';

/**
 * The search box (#27, ui-ux.md 右サイドバー): a `next/form` to /search?q=…, which navigates on the
 * client. An empty or blank query is not sent.
 */
export function SearchBox({ defaultValue }: { defaultValue?: string }) {
  return (
    <Form action="/search" role="search" className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-text-muted"
      />
      <input
        type="search"
        name="q"
        aria-label="検索"
        placeholder="検索"
        defaultValue={defaultValue}
        required
        pattern=".*\S.*"
        maxLength={MAX_QUERY_LENGTH}
        className="h-11 w-full rounded-full border border-transparent bg-hover pr-4 pl-12 text-body outline-none focus:border-brand focus:bg-bg"
      />
    </Form>
  );
}
