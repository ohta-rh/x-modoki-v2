---
type: Architecture
title: "アプリケーションの構造"
description: "ディレクトリの分け方、層の依存の向き、読み取り・変更・キャッシュ・認可の書き方、サーバーのインターフェースの一覧を示す。"
tags: [architecture, structure, security, fsd]
status: stable
---

# アプリケーションの構造

- 決定: [ADR-0022](../adr/0022-feature-sliced-design.md)（Feature-Sliced Design）、[ADR-0030](../adr/0030-fsd-lint-exceptions-and-own-layer-check.md)（守らせ方）、[ADR-0010](../adr/0010-dal-server-actions-route-handlers.md)（データアクセス層）、[ADR-0017](../adr/0017-cloudflare-workers-opennext.md)、[ADR-0021](../adr/0021-coverage-100-percent.md)

## 1. ディレクトリ

```
.
├── app/                        Next.js のルーティングだけ（中身は _pages と _app を呼ぶ）
├── proxy.ts                    ログインしていなければログインへ送る
├── next.config.ts              cacheComponents / partialPrefetching / typedRoutes
├── steiger.config.ts           FSD のリンターの設定
├── vitest.config.ts            カバレッジのしきい値（100%）と、外すものの一覧
├── drizzle.config.ts
├── drizzle/                    マイグレーションの SQL（drizzle-kit generate が作る）
├── docker-compose.yml          ローカルの PostgreSQL と Garage
├── e2e/                        Playwright のテスト
├── scripts/                    check-docs.mjs など
├── .github/workflows/ci.yml    CI（7 つの確認）
├── docs/                       OKF のバンドル
└── src/                        Feature-Sliced Design の層だけ
    ├── _app/
    │   ├── entrypoint/         TanStack Query・テーマの Provider（目的で名前を付ける。ADR-0030）
    │   ├── styles/             Tailwind の入口とテーマの変数
    │   └── api-routes/         Route Handler の実装
    ├── _pages/
    │   └── <page>/
    │       ├── ui/             その画面の同期のコンポーネント
    │       ├── api/            その画面のデータを集める関数（server-only）
    │       ├── index.ts
    │       └── index.server.ts
    ├── widgets/
    │   └── <widget>/{ui,model,lib}/ と index.ts
    ├── features/
    │   └── <feature>/
    │       ├── ui/             その操作の部品（ボタン・フォーム）
    │       ├── api/            変更の問い合わせ（server-only）と actions.ts（'use server'）
    │       ├── model/          Zod のスキーマ、クライアントの状態
    │       └── index.ts
    ├── entities/
    │   └── <entity>/
    │       ├── ui/             その実体の表示
    │       ├── api/            読み取りの問い合わせ（server-only）
    │       ├── model/          DTO の型、Zod のスキーマ
    │       ├── @x/             ほかの実体へ見せる型
    │       ├── index.ts
    │       └── index.server.ts
    └── shared/
        ├── ui/                 業務を知らない部品。ui/kit/ は shadcn/ui から取り込んだもの
        ├── lib/                純粋な関数（ID、文字数、時刻と数の整形）
        ├── config/             env.ts（環境変数の検証）、ルートの定数
        ├── db/                 getDb()（リクエストごとに接続を作る）と schema/
        ├── auth/               Better Auth の設定と、今のユーザーを得る関数
        ├── storage/            S3Client と署名つき URL
        └── api/                Server Action の戻り値の型、エラーの種類、回数の制限
```

### スライスの一覧

| 層 | スライス |
|---|---|
| `_pages` | `landing`、`sign-in`、`sign-up`、`home`、`explore`、`search`、`notifications`、`bookmarks`、`profile`、`follow-list`、`post-detail`、`photo-viewer`、`compose`、`settings` |
| `widgets` | `app-shell`（3 カラムの骨格とナビ）、`right-sidebar`、`timeline-feed`、`post-thread`、`composer-modal`、`profile-header`、`notification-list`、`search-results`、`trends`、`who-to-follow`、`keyboard-shortcuts` |
| `features` | `auth`、`post-compose`、`post-delete`、`post-pin`、`post-like`、`post-repost`、`post-bookmark`、`post-view-count`、`user-follow`、`profile-edit`、`media-upload`、`notifications-read`、`timeline-new-posts`、`search-box`、`display-settings` |
| `entities` | `user`、`post`、`media`、`notification`、`hashtag` |

## 2. 層と依存の向き

```
app/ ──▶ _app, _pages ──▶ widgets ──▶ features ──▶ entities ──▶ shared
                                                      │
                                                      └─ 実体の間は @x だけ
```

| 規則 | 理由 |
|---|---|
| あるスライスが読めるのは、厳密に下の層だけ。同じ層のスライスを読まない | 依存の向きを 1 つにする |
| スライスの外からは、`index.ts`（サーバーだけのものは `index.server.ts`）だけを読む | スライスの中の作りを変えやすくする |
| 実体の間の参照は `entities/<A>/@x/<B>.ts` だけ | 例外を 1 つの形に閉じ込める |
| `src/` の直下に、6 つの層のほかのフォルダを作らない | 置き場所を迷わせない |
| ルートの `app/` が読めるのは `_pages` と `_app` だけ | ルーティングと中身を分ける |
| `@/shared/db` を読めるのは、`api` セグメントと `shared/db`・`shared/auth` だけ | 認可を通らない読み書きを作らない |
| `process.env` を読めるのは `src/shared/config/env.ts` だけ | 検証していない値を使わない |
| 非同期の Server Component は、ルートの `app/` の `page.tsx`・`layout.tsx`・`default.tsx` だけに書く。`src/` のコンポーネントは全部、同期にする | Vitest で測れないファイルに判断を置かない（[ADR-0021](../adr/0021-coverage-100-percent.md)） |
| `'use client'` は葉の部品に付ける。クライアントのファイルから `index.server` を読まない | クライアントへ送る量を小さくし、サーバーのコードを漏らさない |
| モジュールの一番上で、接続・プール・リクエストをまたぐ値を作らない | Cloudflare Workers で動かない（[ADR-0017](../adr/0017-cloudflare-workers-opennext.md)） |

Steiger（`fsd` の推奨の設定。止めた 2 つの決まりは [ADR-0030](../adr/0030-fsd-lint-exceptions-and-own-layer-check.md)）、ESLint の `no-restricted-imports` とローカルの決まり `local/no-server-import-in-client`、`scripts/check-src-layers.mjs` が、`pnpm lint` でこれを守らせる。`sharp` と `node:fs` への書き込みをサーバーのコードから使うことも禁じる。

### ルートの `app/` のファイルの形

```tsx
// app/(main)/home/page.tsx
import { Suspense } from 'react';
import { HomePage, HomePageSkeleton } from '@/_pages/home';
import { loadHomePage } from '@/_pages/home/index.server';

async function Content() {
  return <HomePage {...(await loadHomePage())} />;
}

export default function Page() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <Content />
    </Suspense>
  );
}
```

```ts
// app/api/timeline/following/route.ts
export { getFollowingTimeline as GET } from '@/_app/api-routes';
```

## 3. データアクセス層の書き方

データアクセス層は、`entities/*/api/`（読み取り）と `features/*/api/`（変更）と `_pages/*/api/`（画面のデータを集める関数）。全ての関数が、同じ順で行う。

1. `getSession()`（`shared/auth`）で今のユーザーを得る。ログインが要る関数は、いなければ `UnauthorizedError` を投げる
2. その操作をしてよいかを確かめる（自分の投稿か、など）。だめなら `ForbiddenError` を投げる
3. `getDb()` で読む・書く。複数の表を書くときは 1 つのトランザクションにする
4. DTO にして返す。`bigint` の ID は文字列にする。パスワードのハッシュ・メールアドレス・内部の列を入れない

| 種類 | 場所 | 名前の形 | 例 |
|---|---|---|---|
| 読み取り | `entities/*/api/` | `get…` / `list…` | `listFollowingTimeline({ cursor })`、`getPost(id)`、`getProfile(username)` |
| 変更 | `features/*/api/` | 動詞 | `createPost(input)`、`likePost(postId)`、`followUser(userId)` |
| 画面のデータ | `_pages/*/api/` | `load…Page` | `loadHomePage()`、`loadProfilePage(username)` |

## 4. 読み取り・変更・キャッシュ

| 場面 | やり方 |
|---|---|
| ページの最初の描画 | `app/` の `page.tsx` が `_pages` の `load…Page()` を呼び、同期の画面のコンポーネントへ渡す。`<Suspense>` で包む |
| 一覧の続き | Route Handler（GET）を `useInfiniteQuery` から呼ぶ。最初のページは `initialData` で渡す |
| 新着と未読の確認 | Route Handler（GET）を `useQuery` の `refetchInterval`（30 秒）で呼ぶ（[ADR-0011](../adr/0011-polling-and-after-no-queue.md)） |
| 変更 | Server Action（`features/*/api/actions.ts`）。Zod で確かめ、変更の関数を呼び、結果の DTO を返す |
| 誰が見ても同じ読み取り | `'use cache'`・`cacheLife('minutes')`・`cacheTag(…)`。対象はトレンドとおすすめのユーザーだけ |
| ユーザーごとに違う読み取り | キャッシュしない |
| 変更のあとの描き直し | サーバーが描いた部分は `updateTag()` か `refresh()`。一覧は TanStack Query のキャッシュを書き換える |

エラーの扱い:

| 起きたこと | Server Action の戻り値 | Route Handler |
|---|---|---|
| 入力が正しくない | `{ ok: false, code: 'VALIDATION', fieldErrors }` | 400 |
| ログインしていない | `{ ok: false, code: 'UNAUTHORIZED' }` | 401 |
| してよい操作ではない | `{ ok: false, code: 'FORBIDDEN' }` | 403 |
| 見つからない | `{ ok: false, code: 'NOT_FOUND' }` | 404 |
| 回数の制限 | `{ ok: false, code: 'RATE_LIMITED' }` | 429 |
| 成功 | `{ ok: true, data }` | 200 |

Server Action は例外を投げずに、上の形で返す。想定していない例外だけを投げ、`error.tsx` で受ける。型は `shared/api` に置く。

## 5. サーバーのインターフェース

### Server Action

| スライス | 関数 |
|---|---|
| `features/post-compose` | `createPost` |
| `features/post-delete` | `deletePost` |
| `features/post-pin` | `pinPost`、`unpinPost` |
| `features/post-like` | `likePost`、`unlikePost` |
| `features/post-repost` | `repost`、`undoRepost` |
| `features/post-bookmark` | `bookmarkPost`、`unbookmarkPost`、`clearBookmarks` |
| `features/user-follow` | `followUser`、`unfollowUser` |
| `features/profile-edit` | `updateProfile` |
| `features/media-upload` | `attachMedia`（置かれた画像を確かめる） |
| `features/notifications-read` | `markNotificationsRead` |
| `features/display-settings` | `updateDisplaySettings`（テーマとアクセント） |

登録・ログイン・ログアウトは、`features/account-access` の Server Action が、サーバーの Better Auth（`src/shared/auth`）を呼ぶ（スライスの名前は、`shared/auth` と紛らわしくならないように `account-access` にした。#18）。

### Route Handler

実装は `src/_app/api-routes/`。`app/api/**/route.ts` は書き出すだけ。

| メソッドとパス | 役割 |
|---|---|
| `GET /api/timeline/following?cursor=` | 「フォロー中」の続き |
| `GET /api/timeline/for-you?cursor=` | 「おすすめ」の続き |
| `GET /api/timeline/following/new-count?since=` | 新しい投稿の数 |
| `GET /api/users/{username}/posts?tab=&cursor=` | プロフィールの各タブの続き |
| `GET /api/users/{username}/follows?type=&cursor=` | フォロー中とフォロワーの続き |
| `GET /api/posts/{id}/replies?cursor=` | 返信の続き |
| `GET /api/search?q=&f=&cursor=` | 検索の結果の続き |
| `GET /api/notifications?tab=&cursor=` | 通知の続き |
| `GET /api/notifications/unread-count` | 未読の数 |
| `GET /api/bookmarks?cursor=` | ブックマークの続き |
| `POST /api/uploads/presign` | 画像の署名つき URL を出す |
| `POST /api/posts/{id}/view` | 表示の回数を足す（`after()` で書く） |
| `GET / POST /api/auth/[...all]` | Better Auth |
| `POST /api/cron/cleanup-media` | 結びつかなかった画像を消す（秘密の値で守る） |
| `GET /api/health` | 動いていることの確認（データベースに 1 回問い合わせる） |

一覧の応答は、どれも同じ形にする。

```json
{
  "items": [
    {
      "id": "187263549812736",
      "author": { "username": "taro", "name": "太郎", "avatarUrl": "https://…" },
      "text": "こんにちは #はじめまして",
      "createdAt": "2026-11-18T03:12:45.000Z",
      "media": [{ "url": "https://…", "width": 1200, "height": 675, "alt": "" }],
      "counts": { "replies": 2, "reposts": 1, "likes": 14, "bookmarks": 0, "views": 320 },
      "viewer": { "liked": true, "reposted": false, "bookmarked": false },
      "repostedBy": null,
      "replyTo": null,
      "quoted": null
    }
  ],
  "nextCursor": "187263549812000"
}
```

`nextCursor` が `null` なら、続きは無い。

## 6. 安全のための規則

| 規則 | 場所 |
|---|---|
| 認証と認可は、Server Action と Route Handler のたびに `api` セグメントで行う。`proxy.ts` の確認に頼らない | `entities/*/api`、`features/*/api` |
| 入力は全部 Zod で確かめる。ルートの引数（`username`・`postId`）も確かめる | 各スライスの `model` |
| クライアントへ渡すのは DTO だけ | 各スライスの `model` |
| セッションの cookie は HttpOnly・Secure・SameSite=Lax | `shared/auth` |
| 投稿・フォロー・画像の署名・ログインに回数の制限を付ける | `shared/api` |
| 本文は文字として出す。HTML として出さない。リンクは `twitter-text` で取り出して、`http` と `https` だけを許す | `entities/post/ui` |
| 画像は種類と大きさを署名の前に確かめ、置かれたあとに先頭のバイトで種類と縦横を確かめる。アプリとは別のドメインから出す（[ADR-0018](../adr/0018-resize-images-in-browser.md)） | `features/media-upload` |
| 秘密の値は環境変数だけに置き、`env.ts` で検証する。`NEXT_PUBLIC_` を付けるのは公開してよい値だけ | `shared/config` |
