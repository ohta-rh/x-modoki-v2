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
};
