// The signed-in user for data access tests (docs/architecture/test-strategy.md 3). A test file
// routes getSession() here with:
//   vi.mock('@/shared/auth/index.server', async (orig) => ({ ...(await orig()), getSession: currentSession }));
import type { SessionUser } from '@/shared/auth/index.server';

let current: SessionUser | null = null;

export const currentSession = async () => current;

export function signInAs(user: {
  id: string;
  name: string;
  username: string | null;
  image?: string | null;
}) {
  current = {
    id: user.id,
    name: user.name,
    username: user.username ?? '',
    displayUsername: user.username ?? '',
    image: user.image ?? null,
  };
}

export function signOut() {
  current = null;
}
