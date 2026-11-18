import { setupTestDb, testDb } from '@test/db';
import { describe, expect, it } from 'vitest';
import { rateLimits } from '@/shared/db';
import { hitRateLimit } from './rate-limit';

setupTestDb();

const at = (seconds: number) => Date.UTC(2026, 10, 18, 12, 0, seconds);

describe('hitRateLimit（NFR-SEC-05、ADR-0010）', () => {
  // NFR-SEC-05: 投稿（1 分に 10）・フォロー（1 分に 30）・画像の署名・ログインと登録（同じ IP から 1 分に 10）に回数の制限があり、超えると `RATE_LIMITED`（429）
  it('区切りの中で limit 回までは通し、limit + 1 回目で止める', async () => {
    const results = [];
    for (let i = 0; i < 11; i += 1) {
      results.push(await hitRateLimit('auth:1.2.3.4', { limit: 10, windowMs: 60_000, now: at(i) }));
    }
    expect(results.slice(0, 10).every(Boolean)).toBe(true);
    expect(results[10]).toBe(false);
  });

  it('次の区切りになれば、また通す', async () => {
    for (let i = 0; i < 3; i += 1)
      await hitRateLimit('k', { limit: 2, windowMs: 60_000, now: at(10) });
    expect(await hitRateLimit('k', { limit: 2, windowMs: 60_000, now: at(10) + 60_000 })).toBe(
      true,
    );
  });

  it('キーごとに別に数える', async () => {
    await hitRateLimit('a', { limit: 1, windowMs: 60_000, now: at(0) });
    expect(await hitRateLimit('b', { limit: 1, windowMs: 60_000, now: at(0) })).toBe(true);
  });

  it('同時に呼んでも、数え落とさない', async () => {
    await Promise.all(
      Array.from({ length: 20 }, () =>
        hitRateLimit('c', { limit: 100, windowMs: 60_000, now: at(0) }),
      ),
    );
    const [row] = await testDb().select().from(rateLimits);
    expect(row.count).toBe(20);
    expect(row.windowStart.getTime()).toBe(Date.UTC(2026, 10, 18, 12, 0, 0));
  });
});
