import { Suspense } from 'react';
import { BookmarksPage } from '@/_pages/bookmarks';
import { loadBookmarksPage } from '@/_pages/bookmarks/index.server';

async function Bookmarks() {
  return <BookmarksPage {...await loadBookmarksPage()} />;
}

export default function Page() {
  return (
    <Suspense>
      <Bookmarks />
    </Suspense>
  );
}
