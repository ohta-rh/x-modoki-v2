import { Suspense } from 'react';
import { SearchPage } from '@/_pages/search';
import { loadSearchPage } from '@/_pages/search/index.server';

type SearchParams = PageProps<'/search'>['searchParams'];

async function Search({ searchParams }: { searchParams: SearchParams }) {
  const { q, f } = await searchParams;
  return <SearchPage {...await loadSearchPage(q, f)} />;
}

export default function Page({ searchParams }: PageProps<'/search'>) {
  return (
    <Suspense>
      <Search searchParams={searchParams} />
    </Suspense>
  );
}
