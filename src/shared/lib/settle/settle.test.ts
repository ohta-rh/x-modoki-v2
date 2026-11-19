import { redirect } from 'next/navigation';
import { describe, expect, it } from 'vitest';
import { OFFLINE_MESSAGE, settle } from './settle';

describe('settle（#70）', () => {
  it('通った Server Action の結果は、そのまま返す（ok: false もそのまま）', async () => {
    expect(await settle(Promise.resolve({ ok: true as const }), { ok: false })).toEqual({
      ok: true,
    });
    expect(
      await settle(Promise.resolve({ ok: false, message: 'ほか' }), { ok: false, message: 'x' }),
    ).toEqual({ ok: false, message: 'ほか' });
  });

  it('通信が切れて Promise が失敗したら、投げずに渡した失敗の結果を返す', async () => {
    expect(
      await settle(Promise.reject(new TypeError('Failed to fetch')), {
        ok: false,
        message: OFFLINE_MESSAGE,
      }),
    ).toEqual({ ok: false, message: '通信できませんでした。もう一度お試しください' });
  });

  it('移動（redirect）で拒まれたときは、失敗にせず投げ直す（Next.js が移動に使う、#82 のレビュー 1）', async () => {
    let moved: unknown;
    try {
      redirect('/home');
    } catch (error) {
      moved = error;
    }
    await expect(settle(Promise.reject(moved), { ok: false })).rejects.toBe(moved);
  });
});
