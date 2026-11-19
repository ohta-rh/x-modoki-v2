/** What a follow button gets back: the followed user's follower count, or a message to show. */
export type FollowActionResult =
  | { ok: true; followersCount: number }
  | {
      ok: false;
      // OFFLINE: the request never reached the server; only the client gives it (#70).
      code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'FORBIDDEN' | 'RATE_LIMITED' | 'OFFLINE';
      message: string;
    };
