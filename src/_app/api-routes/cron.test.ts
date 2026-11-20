import { beforeEach, describe, expect, it, vi } from 'vitest';
import { postCleanupMedia } from './cron';

// The secret check and the cleanup run against PostgreSQL and Garage in the feature's own test.
const cleanupMedia = vi.fn();
vi.mock('@/features/media-cleanup/index.server', () => ({
  cleanupMedia: (...args: unknown[]) => cleanupMedia(...args),
}));

beforeEach(() => cleanupMedia.mockReset());

const call = (authorization?: string) =>
  postCleanupMedia(
    new Request('http://localhost:3000/api/cron/cleanup-media', {
      method: 'POST',
      headers: authorization === undefined ? {} : { authorization },
    }),
  );

describe('POST /api/cron/cleanup-media（#25、T-15）', () => {
  it('Authorization をそのまま渡し、片付けたら消した数を返す', async () => {
    cleanupMedia.mockResolvedValue({ ok: true, removed: 3 });
    const response = await call('Bearer s');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ removed: 3 });
    expect(cleanupMedia).toHaveBeenCalledWith({ authorization: 'Bearer s' });
  });

  // AUTHZ: postCleanupMedia UNAUTHORIZED
  it('秘密の値が違えば 401（Authorization が無ければ null を渡す）', async () => {
    cleanupMedia.mockResolvedValue({ ok: false, error: 'UNAUTHORIZED' });
    const response = await call();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHORIZED' });
    expect(cleanupMedia).toHaveBeenCalledWith({ authorization: null });
  });
});
