import type { PostPage, UserPostsTab } from '@/entities/post';
import type { Profile } from '@/entities/user';
import { setBookmarkAction } from '@/features/post-bookmark/index.server';
import { createQuoteAction } from '@/features/post-compose/index.server';
import { deletePostAction } from '@/features/post-delete/index.server';
import { setLikeAction } from '@/features/post-like/index.server';
import { setPinAction } from '@/features/post-pin/index.server';
import { setRepostAction } from '@/features/post-repost/index.server';
import { PageHeader } from '@/widgets/app-shell';
import { ProfileHeader, ProfileTabs } from '@/widgets/profile-header';
import { PostFeed } from '@/widgets/timeline-feed';

type Props = {
  profile: Profile;
  tab: UserPostsTab;
  firstPage: PostPage;
  now: string;
  signedIn: boolean;
};

const EMPTY: Record<UserPostsTab, string> = {
  posts: 'まだポストがありません',
  with_replies: 'まだポストがありません',
  media: 'まだメディアがありません',
  likes: 'まだいいねしたポストがありません',
};

/** /{username} and its tabs (#23, ui-ux.md 8). */
export function ProfilePage({ profile, tab, firstPage, now, signedIn }: Props) {
  return (
    <>
      <PageHeader title={profile.name}>
        <span className="ml-3 text-[13px] text-text-muted">
          {profile.postsCount.toLocaleString('ja-JP')} 件のポスト
        </span>
      </PageHeader>
      <ProfileHeader profile={profile} />
      <ProfileTabs username={profile.username} tab={tab} isSelf={profile.isSelf} />
      <PostFeed
        key={tab}
        queryKey={['profile', profile.username, tab]}
        endpoint={`/api/users/${profile.username}/posts?tab=${tab}`}
        firstPage={firstPage}
        now={now}
        emptyText={EMPTY[tab]}
        {...(signedIn
          ? {
              deleteAction: deletePostAction,
              likeAction: setLikeAction,
              bookmarkAction: setBookmarkAction,
              repostAction: setRepostAction,
              quoteAction: createQuoteAction,
              pinAction: profile.isSelf ? setPinAction : undefined,
            }
          : {})}
      />
    </>
  );
}
