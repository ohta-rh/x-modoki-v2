import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSearch } from './search';

// The searches themselves run against PostgreSQL in their entities' tests.
const searchPosts = vi.fn();
const searchUsers = vi.fn();
vi.mock('@/entities/post/index.server', () => ({
  searchPosts: (...args: unknown[]) => searchPosts(...args),
}));
vi.mock('@/entities/user/index.server', () => ({
  searchUsers: (...args: unknown[]) => searchUsers(...args),
}));

beforeEach(() => {
  searchPosts.mockReset().mockResolvedValue({ ok: true, page: { items: [], nextCursor: 'p' } });
  searchUsers.mockReset().mockResolvedValue({ ok: true, page: { items: [], nextCursor: 'u' } });
});

const call = (query: string) => getSearch(new Request(`http://localhost:3000/api/search${query}`));

describe('GET /api/search（#27）', () => {
  it('f で話題・最新・メディア・ユーザーを分け、q とカーソルを渡す', async () => {
    expect(await (await call('?q=%E7%8C%AB')).json()).toEqual({ items: [], nextCursor: 'p' });
    expect(searchPosts).toHaveBeenLastCalledWith('猫', 'top', null);
    await call('?q=%E7%8C%AB&f=live&cursor=9');
    expect(searchPosts).toHaveBeenLastCalledWith('猫', 'live', '9');
    await call('?q=%23tag&f=media');
    expect(searchPosts).toHaveBeenLastCalledWith('#tag', 'media', null);
    expect(await (await call('?q=hana&f=user&cursor=')).json()).toEqual({
      items: [],
      nextCursor: 'u',
    });
    expect(searchUsers).toHaveBeenLastCalledWith('hana', null);
  });

  // NFR-SEC-02: 全ての入力（フォーム・JSON・ルートの引数・検索の語）を Zod で確かめ、形が違えば `VALIDATION`（Route Handler は 400）
  it('q は前後の空白を除いて 1〜100 文字。そうでなければ 400', async () => {
    for (const query of ['', '?q=', '?q=%20%20', `?q=${'a'.repeat(101)}`]) {
      const response = await call(query);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'VALIDATION' });
    }
    await call('?q=%20%E7%8C%AB%20');
    expect(searchPosts).toHaveBeenLastCalledWith('猫', 'top', null);
    expect((await call(`?q=${'a'.repeat(100)}`)).status).toBe(200);
  });

  it('知らない f は 400 で、検索しない（#62）', async () => {
    const response = await call('?q=a&f=nope');
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'VALIDATION' });
    expect(searchPosts).not.toHaveBeenCalled();
    expect(searchUsers).not.toHaveBeenCalled();
  });

  it('カーソルが壊れていれば 400', async () => {
    searchPosts.mockResolvedValueOnce({ ok: false, error: 'BAD_CURSOR' });
    expect((await call('?q=a&cursor=x')).status).toBe(400);
    searchUsers.mockResolvedValueOnce({ ok: false, error: 'BAD_CURSOR' });
    expect((await call('?q=a&f=user&cursor=x')).status).toBe(400);
  });
});
