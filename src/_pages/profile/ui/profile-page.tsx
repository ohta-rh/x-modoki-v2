import type { PostPage, UserPostsTab } from '@/entities/post';
import type { Profile } from '@/entities/user';
import { setBookmarkAction } from '@/features/post-bookmark/index.server';
import { createQuoteAction } from '@/features/post-compose/index.server';
import { deletePostAction } from '@/features/post-delete/index.server';
import { setLikeAction } from '@/features/post-like/index.server';
import { setPinAction } from '@/features/post-pin/index.server';
import { setRepostAction } from '@/features/post-repost/index.server';
import { setFollowAction } from '@/features/user-follow/index.server';
import { PageHeader } from '@/widgets/app-shell';
import { ProfileHeader, ProfileTabs } from '@/widgets/profile-header';
import { PostFeed } from '@/widgets/timeline-feed';
import { ProfileFollowHeader } from './profile-follow-header';

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
        <span className="ml-3 shrink-0 text-[13px] whitespace-nowrap text-text-muted">
          {profile.postsCount.toLocaleString('ja-JP')} 件のポスト
        </span>
      </PageHeader>
      {profile.isSelf ? (
        <ProfileHeader profile={profile} />
      ) : (
        <ProfileFollowHeader profile={profile} signedIn={signedIn} action={setFollowAction} />
      )}
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
              // Only the ポスト tab marks the pinned post, so only there can the menu unpin it.
              pinAction: profile.isSelf && tab === 'posts' ? setPinAction : undefined,
            }
          : {})}
      />
    </>
  );
}
