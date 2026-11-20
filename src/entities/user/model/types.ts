/** A user as shown next to a post (no email, no internal columns: NFR-SEC-03). */
export type UserSummary = { username: string; name: string; avatarUrl: string | null };

/** A user's profile page (#23, ui-ux.md 8): no email, no internal columns (NFR-SEC-03). */
export type Profile = UserSummary & {
  bannerUrl: string | null;
  bio: string;
  location: string;
  website: string;
  joinedAt: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  /** The viewer is this user. */
  isSelf: boolean;
  /** The viewer follows this user (#24). */
  isFollowing: boolean;
};

/** One row of a following / followers list (#24). */
export type FollowUser = UserSummary & {
  bio: string;
  /** The viewer follows this user. */
  isFollowing: boolean;
  /** This row is the viewer. */
  isSelf: boolean;
};

export type FollowPage = { items: FollowUser[]; nextCursor: string | null };

export type FollowListType = 'following' | 'followers';
