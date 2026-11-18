import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '@/shared/config';
import { postCleanupMedia } from './cron';

// The cleanup itself runs against PostgreSQL and Garage in its own test (features/media-cleanup).
const cleanupMedia = vi.fn(async () => ({ removed: 3 }));
vi.mock('@/features/media-cleanup/index.server', () => ({
  cleanupMedia: (...args: unknown[]) => cleanupMedia(...(args as [])),
}));

beforeEach(() => cleanupMedia.mockClear());

const call = (authorization?: string) =>
  postCleanupMedia(
    new Request('http://localhost:3000/api/cron/cleanup-media', {
      method: 'POST',
      headers: authorization === undefined ? {} : { authorization },
    }),
  );

describe('POST /api/cron/cleanup-media（#25、T-15）', () => {
  it('秘密の値が合えば片付けて、消した数を返す', async () => {
    const response = await call(`Bearer ${env.CRON_SECRET}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ removed: 3 });
    expect(cleanupMedia).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, '', 'Bearer wrong', env.CRON_SECRET, `Bearer ${env.CRON_SECRET}x`])(
    '秘密の値が違えば（%s）401 で、何も消さない',
    async (authorization) => {
      const response = await call(authorization);
      expect(response.status).toBe(401);
      expect(cleanupMedia).not.toHaveBeenCalled();
    },
  );
});
