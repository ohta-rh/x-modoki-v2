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

  it('ルーティングの 1 節で「ログインが必要」の画面と、% を含むパス（#73）を対象にする', () => {
    expect(config.matcher).toEqual([
      '/home',
      '/explore',
      '/search',
      '/notifications/:path*',
      '/i/bookmarks',
      '/compose/:path*',
      '/settings/:path*',
      '/:username/likes',
      '/:path(.*%.*)',
    ]);
  });
});

describe('proxy の壊れた URL（#73）', () => {
  it('解読できない % を含むパスは、ログインの有無によらず 404 の画面へ書き換える', () => {
    for (const cookie of [undefined, 'better-auth.session_token=abc.def']) {
      const response = proxy(request('http://localhost:3000/x/status/%ZZ', cookie));
      expect(response.headers.get('x-middleware-rewrite')).toBe('http://localhost:3000/404');
      expect(response.headers.get('location')).toBeNull();
    }
  });

  it('% を含むパスでも通るので、ログインが要る画面かどうかを matcher と同じ形で見分ける', () => {
    const needs = [
      '/home',
      '/explore',
      '/search',
      '/notifications',
      '/notifications/mentions',
      '/i/bookmarks',
      '/compose/post',
      '/settings',
      '/settings/profile',
      '/taro/likes',
    ];
    for (const path of needs) {
      expect(proxy(request(`http://localhost:3000${path}`)).status, path).toBe(307);
    }
    const open = ['/', '/taro', '/taro/status/1', '/i/flow/login', '/homes', '/taro/likes/x'];
    for (const path of open) {
      expect(
        proxy(request(`http://localhost:3000${path}`)).headers.get('x-middleware-next'),
        path,
      ).toBe('1');
    }
  });

  it('正しく符号化された公開の画面は、ログインが無くても通す', () => {
    const response = proxy(request('http://localhost:3000/%E3%81%82/status/1'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('正しく符号化されていても、ログインが要る画面ならログインへ送る', () => {
    for (const path of ['/settings/%E3%81%82', '/%E3%81%82/likes']) {
      const response = proxy(request(`http://localhost:3000${path}`));
      expect(response.status, path).toBe(307);
      expect(response.headers.get('location'), path).toContain('/i/flow/login?next=');
    }
  });
});
