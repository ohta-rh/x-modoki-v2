import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { config, proxy } from './proxy';

const request = (url: string, cookie?: string) =>
  new NextRequest(url, { headers: cookie ? { cookie } : {} });

describe('proxy（routing.md の 1 節、ADR-0010）', () => {
  it('セッションの cookie が無ければ、元のパスを next に付けてログインへ送る', () => {
    const response = proxy(request('http://localhost:3000/notifications/mentions?x=1'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/i/flow/login?next=%2Fnotifications%2Fmentions%3Fx%3D1',
    );
  });

  it('セッションの cookie があれば通す（中身の確認はデータアクセス層が行う）', () => {
    const response = proxy(
      request('http://localhost:3000/home', 'better-auth.session_token=abc.def'),
    );
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('ルーティングの 1 節で「ログインが必要」の画面だけを対象にする', () => {
    expect(config.matcher).toEqual([
      '/home',
      '/explore',
      '/search',
      '/notifications/:path*',
      '/i/bookmarks',
      '/compose/:path*',
      '/settings/:path*',
      '/:username/likes',
    ]);
  });
});
