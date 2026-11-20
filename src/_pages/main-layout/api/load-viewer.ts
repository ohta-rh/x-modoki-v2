import 'server-only';
import { countUnread } from '@/entities/notification/index.server';
import { getSession } from '@/shared/auth/index.server';
import type { Accent, Theme } from '@/shared/config';
import { mediaUrl } from '@/shared/lib/media-url';

/** `image` is the avatar's URL on the media host (the session holds its storage key, #25). */
export type Viewer = {
  name: string;
  username: string;
  image: string | null;
  /** Unread notifications, the badge's first value (#26). */
  unread: number;
  /** The saved look, to keep the cookie the head script reads in step (#29). */
  theme: Theme;
  accent: Accent;
};

/**
 * The signed-in user for the shell's account menu, or null. Requiring a session is the job of
 * proxy.ts and of each page's data access: /{username} needs no login (routing.md 1).
 */
export async function loadViewer(): Promise<Viewer | null> {
  const session = await getSession();
  if (!session) return null;
  return {
    name: session.name,
    username: session.username,
    image: mediaUrl(session.image),
    // Signed in (checked above), so the count is a number.
    unread: (await countUnread())!,
    theme: session.theme as Theme,
    accent: session.accent as Accent,
  };
}
