---
type: Research
title: "Better Auth 1.7 を Next.js 16.4 で動かした結果"
description: "Better Auth 1.7.25 と Drizzle と PostgreSQL を、Cache Components を有効にした Next.js 16.4.6 で動かし、登録からログアウトまでと `proxy.ts` を確かめた結果と、動かすのに要った設定。"
tags: [auth, nextjs, spike]
status: stable
---

# Better Auth 1.7 を Next.js 16.4 で動かした結果

## 調査日: 2026-11-18

- issue: #10
- 捨てる場所に最小のアプリを作って動かした（リポジトリには入れていない）
- 結論: **ADR-0007 のまま Better Auth を使える。** ただし、下の 2 つの決まりを守らないと、ビルドか実行の時に落ちる

## 1. 使った版

| パッケージ | 版 |
|---|---|
| `next` | 16.4.6（`cacheComponents`・`partialPrefetching`・`typedRoutes` を有効） |
| `react` / `react-dom` | 19.3.1 |
| `better-auth` | 1.7.25（`username` と `nextCookies` のプラグイン） |
| `drizzle-orm` / `drizzle-kit` | 0.45.4 / 0.31.11 |
| `pg` | 8.23.1 |
| PostgreSQL | `postgres:18-alpine` |
| TypeScript | 6.0.3 |
| pnpm | 12.21.0 |

## 2. 確かめたこと

`next build` のあと `next start` で動かし、Chrome で操作した。

| # | 確かめたこと | 結果 |
|---|---|---|
| 1 | 名前・ユーザー名・メールアドレス・パスワードで登録 | 動いた。`/home` に移り「ようこそ @taro_spike（太郎）」と出た |
| 2 | ユーザー名とパスワードでログイン | 動いた。間違ったパスワードでは `Invalid username or password` の 1 つの文言（どちらが違うかを示さない） |
| 3 | ログアウト | 動いた。`session` の行が消え、`/home` を開くとログインへ送られた |
| 4 | Server Component からのセッションの読み出し | 動いた（`<Suspense>` の中） |
| 5 | Server Action からのセッションの読み出し | 動いた（`action sees taro_spike`） |
| 6 | `proxy.ts`（リポジトリのルート）でログインへ送る | 動いた。`/home` → 307 → `/i/flow/login?next=%2Fhome` |
| 7 | `next build` | 通った。`/home` は Partial Prerender（静的な外枠と、あとから流れるセッションの部分） |
| 8 | cookie の属性 | `better-auth.session_token`、`HttpOnly`、`SameSite=Lax`、`Max-Age=604800`、`Path=/`。http では `Secure` が付かない |
| 9 | ユーザー名の大文字と小文字 | `taro_spike` があるとき `TARO_SPIKE` の登録は `USERNAME_IS_ALREADY_TAKEN` で拒まれた（小文字にそろえて比べる） |
| 10 | パスワードの保存 | `account.password` に、入れた文字そのものではない値（ハッシュ）が入った |
| 11 | 接続の漏れ | 30 回の要求のあとも、データベースへの接続は 1 本のまま |

## 3. 当たった問題と直し方

### 3.1 `betterAuth()` は作るときに `Math.random()` を呼ぶ

`getAuth().api.getSession({ headers: await headers() })` と書くと、引数の `await headers()` より先に `getAuth()`（`betterAuth()`）が動く。Cache Components はプリレンダーの中の `Math.random()` を許さないので、`next build` が `/home` で落ちた。

**直し方**: リクエストの値（`headers()`）を先に読んでから、`getAuth()` を呼ぶ。

### 3.2 実行時のプリレンダーでセッションを読みにいき、2 つのエラーが出る

3.1 を直してビルドは通ったが、ログインのあと `/home` へ移ったときに、サーバーのログに 2 つのエラーが出た。画面は正しく出ていた。

- `Route "/home": Next.js encountered the unstable value Math.random() while prerendering`
- `[Better Auth] Failed query ... Cannot use a pool after calling end on the pool`

`partialPrefetching` の実行時のプリレンダーの中で、`headers()` が読めてしまい、Better Auth がデータベースを引いた。そのプリレンダーでは `after()` が先に動いて接続のプールを閉じていた。

**直し方**: セッションを読む前に `await connection()` を呼ぶ。これで、その部分はリクエストの時だけに動く。直したあと、同じ操作（読み込み・Server Action・ログアウト・転送・ログイン）でエラーは 0 件になった。

### 3.3 Better Auth に表を作る道具が入っていない

`better-auth` 1.7.25 のパッケージには、スキーマを作るコマンドが無い。Drizzle の表は、`@better-auth/core` の `get-tables` の定義（`user`・`session`・`account`・`verification`）を見て手で書いた。`username` のプラグインは `user` に `username`（一意）と `display_username` を足す。

### 3.4 pnpm 10 から pnpm 12 へ自動で切り替わらない

`package.json` に `"packageManager": "pnpm@12.21.0"` と書くと、手元の pnpm 10.28.2 は 12 へ切り替えようとして `ENOEXEC` で落ちた。`npx -y pnpm@12.21.0` で動かすと使えた。手順書（#35）に書く。

### 3.5 pnpm 12 は、許していない依存の build スクリプトで止まる

esbuild の `postinstall` で `ERR_PNPM_IGNORED_BUILDS` になった。`pnpm-workspace.yaml` に次を書くと通った。

```yaml
allowBuilds:
  esbuild: true
```

## 4. 動いた設定

`src/shared/db/client.ts`（リクエストごとにプールを作り、応答のあとで閉じる。ADR-0017）:

```ts
import 'server-only';
import { drizzle } from 'drizzle-orm/node-postgres';
import { after } from 'next/server';
import { Pool } from 'pg';
import { cache } from 'react';
import * as schema from './schema';

export const getDb = cache(() => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  after(() => pool.end());
  return drizzle(pool, { schema });
});
```

`src/shared/auth/auth.ts`:

```ts
import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { username } from 'better-auth/plugins';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import { cache } from 'react';
import { getDb } from '../db/client';
import * as schema from '../db/schema';

export const getAuth = cache(() =>
  betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(getDb(), { provider: 'pg', schema }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    rateLimit: { enabled: false }, // 回数の制限は自前の 1 つの仕組みにそろえる（ADR-0010）
    plugins: [username({ minUsernameLength: 4, maxUsernameLength: 15 }), nextCookies()],
  }),
);

export const getSession = cache(async () => {
  await connection(); // 3.2: 実行時のプリレンダーでは読まない
  const requestHeaders = await headers(); // 3.1: betterAuth() より先に読む
  return getAuth().api.getSession({ headers: requestHeaders });
});
```

`app/api/auth/[...all]/route.ts`:

```ts
import { getAuth } from '@/shared/auth/auth';
export async function GET(request: Request) {
  return getAuth().handler(request);
}
export async function POST(request: Request) {
  return getAuth().handler(request);
}
```

`proxy.ts`（リポジトリのルート。cookie があるかだけを見る粗い門）:

```ts
import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL('/i/flow/login', request.url);
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ['/home'] };
```

クライアント（`'use client'`）:

```ts
import { usernameClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
export const authClient = createAuthClient({ plugins: [usernameClient()] });
// 登録: authClient.signUp.email({ name, email, password, username })
// ログイン: authClient.signIn.username({ username, password })
```

Server Action でのログアウト:

```ts
'use server';
const requestHeaders = await headers();
await getAuth().api.signOut({ headers: requestHeaders });
redirect('/');
```

## 5. `username` のプラグインが使う列

| 表 | 列 | 型 | 制約 |
|---|---|---|---|
| `user` | `username` | `text` | 一意。小文字にそろえて入る |
| `user` | `display_username` | `text` | 入れたままの大文字と小文字 |

ほかの表（`session`・`account`・`verification`）は Better Auth の標準のまま。`account.password` にパスワードのハッシュが入る。

## 6. 実装（#18）への申し送り

- セッションを読む関数は、必ず `await connection()` → `await headers()` → `getAuth()` の順にする
- 間違ったパスワードの文言は英語で返る。画面では日本語の 1 つの文言に置き換える（FR-AUTH-04）
- 本番（https）では cookie に `Secure` が付くことを、マイルストーン 2 で確かめる
- Better Auth の組み込みの回数の制限は止め、自前の `rate_limits` にそろえる（#18 の実装方針のとおり）

## 未検証事項

- Cloudflare Workers の上での動き（マイルストーン 2）
- メールの確認・OAuth・パスキー（範囲の外）
- 同時に大量のリクエストが来たときの、リクエストごとのプールの負荷

## 参考リンク

- Next.js の同梱の文書: `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`、`03-api-reference/04-functions/connection.md`、`03-api-reference/03-file-conventions/proxy.md`
- [Better Auth](https://better-auth.com/)
