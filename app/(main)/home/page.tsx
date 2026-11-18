import { Suspense } from 'react';
import { HomePage } from '@/_pages/home';
import { loadHomePage } from '@/_pages/home/index.server';

async function Home({ searchParams }: Pick<PageProps<'/home'>, 'searchParams'>) {
  const { tab } = await searchParams;
  return <HomePage {...await loadHomePage(tab)} />;
}

export default function Page({ searchParams }: PageProps<'/home'>) {
  return (
    <Suspense>
      <Home searchParams={searchParams} />
    </Suspense>
  );
}
