import type { PostPage } from '@/entities/post';
import { clearBookmarksAction, setBookmarkAction } from '@/features/post-bookmark/index.server';
import { deletePostAction } from '@/features/post-delete/index.server';
import { setLikeAction } from '@/features/post-like/index.server';
import { BookmarksFeed } from './bookmarks-feed';

type Props = { username: string; firstPage: PostPage; now: string };

/** /i/bookmarks: the viewer's bookmarks, newest bookmark first (#21). */
export function BookmarksPage(props: Props) {
  return (
    <BookmarksFeed
      {...props}
      clearAction={clearBookmarksAction}
      likeAction={setLikeAction}
      bookmarkAction={setBookmarkAction}
      deleteAction={deletePostAction}
    />
  );
}
