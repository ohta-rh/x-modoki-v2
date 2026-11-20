import { beforeEach, describe, expect, it, vi } from 'vitest';

const VALID = {
  DATABASE_URL: 'postgres://u:p@localhost:54320/db',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
  S3_ENDPOINT: 'http://localhost:3900',
  S3_REGION: 'garage',
  S3_BUCKET: 'xmodoki-media',
  S3_ACCESS_KEY_ID: 'key',
  S3_SECRET_ACCESS_KEY: 'secret',
  S3_FORCE_PATH_STYLE: 'true',
  NEXT_PUBLIC_MEDIA_BASE_URL: 'http://media.localhost:3902',
  CRON_SECRET: 'b'.repeat(16),
};

async function load(overrides: Record<string, string | undefined> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...VALID, ...overrides })) vi.stubEnv(key, value);
  return (await import('./env')).env;
}

describe('env', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('全ての変数が揃っていれば、型のついた値を返す', async () => {
    const env = await load();
    expect(env.DATABASE_URL).toBe(VALID.DATABASE_URL);
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
    expect(env.NEXT_PUBLIC_MEDIA_BASE_URL).toBe(VALID.NEXT_PUBLIC_MEDIA_BASE_URL);
  });

  it('S3_FORCE_PATH_STYLE=false は false になる', async () => {
    expect((await load({ S3_FORCE_PATH_STYLE: 'false' })).S3_FORCE_PATH_STYLE).toBe(false);
  });

  // NFR-SEC-08: 秘密の値は環境変数だけに置き、`src/shared/config/env.ts` で検証する。`NEXT_PUBLIC_` を付けるのは公開してよい値だけ。リポジトリに秘密の値が無い
  it('NFR-SEC-08: 足りない変数があると、読み込みの時点で例外を投げる', async () => {
    await expect(load({ DATABASE_URL: undefined })).rejects.toThrow(
      /Invalid environment variables/,
    );
  });

  it('空の文字列は、足りないものとして扱う', async () => {
    await expect(load({ CRON_SECRET: '' })).rejects.toThrow(/Invalid environment variables/);
  });

  it('AUTH_RATE_LIMIT_PER_MINUTE は既定で 10、入れれば整数として読む（ADR-0036）', async () => {
    expect((await load()).AUTH_RATE_LIMIT_PER_MINUTE).toBe(10);
    expect((await load({ AUTH_RATE_LIMIT_PER_MINUTE: '1000' })).AUTH_RATE_LIMIT_PER_MINUTE).toBe(
      1000,
    );
    await expect(load({ AUTH_RATE_LIMIT_PER_MINUTE: '0' })).rejects.toThrow(
      /Invalid environment variables/,
    );
  });

  it('短すぎる秘密の値を拒む', async () => {
    await expect(load({ BETTER_AUTH_SECRET: 'short' })).rejects.toThrow(
      /Invalid environment variables/,
    );
  });
});
