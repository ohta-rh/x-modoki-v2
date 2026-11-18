---
type: Architecture
title: "アプリケーションの構造"
description: "ディレクトリの分け方、層の依存の向き、読み取り・変更・キャッシュ・認可の書き方、サーバーのインターフェースの一覧を示す。"
tags: [architecture, structure, security]
status: stable
---

# アプリケーションの構造

- 決定: [ADR-0010](../adr/0010-dal-server-actions-route-handlers.md)、[ADR-0004](../adr/0004-nextjs-16-all-in-one-app.md)

## 1. ディレクトリ

```
.
├── docker-compose.yml          ローカルの PostgreSQL と Garage
├── next.config.ts              cacheComponents / partialPrefetching / typedRoutes / output: 'standalone'
├── drizzle.config.ts
├── drizzle/                    マイグレーションの SQL（drizzle-kit generate が作る）
├── e2e/                        Playwright のテスト
├── docs/                       OKF のバンドル
└── src/
    ├── proxy.ts                ログインしていなければログインへ送る
    ├── env.ts                  環境変数の検証（t3-env と Zod）
    ├── app/                    ルートだけ。中身は features を呼ぶ
    ├── features/               機能ごと
    │   └── <feature>/
    │       ├── data.ts         データアクセス層（import 'server-only'）
    │       ├── actions.ts      Server Action（'use server'）
    │       ├── schema.ts       Zod のスキーマ（サーバーとクライアントで共有）
    │       ├── types.ts        DTO の型
    │       ├── components/     その機能の部品
    │       └── hooks/          その機能のクライアントのフック
    ├── components/
    │   ├── ui/                 shadcn/ui から取り込んだ部品
    │   └── layout/             3 カラムの骨格、ナビ、ヘッダー
    ├── server/                 サーバーだけ（import 'server-only'）
    │   ├── db/                 Drizzle のクライアントとスキーマ（schema/）
    │   ├── auth.ts             Better Auth の設定
    │   ├── session.ts          今のユーザーを得る（React の cache()）
    │   ├── storage.ts          S3Client と署名つき URL
    │   └── rate-limit.ts       回数の制限
    ├── lib/                    どこからでも使える純粋な関数（ID、文字数、時刻と数の整形）
    └── styles/                 Tailwind の入口とテーマの変数
```

機能（`features/`）: `auth`、`posts`、`timeline`、`engagement`（いいね・リポスト・ブックマーク）、`profiles`、`follows`、`notifications`、`search`、`media`、`settings`。

## 2. 層と依存の向き

```
app/  ──▶  features/*/components ──▶ components/ui, lib
  │              │
  │              └──▶ features/*/actions.ts ──▶ features/*/data.ts ──▶ server/ ──▶ PostgreSQL・ストレージ
  └──────────────────────────────────────────▶ features/*/data.ts
```

| 規則 | 理由 |
|---|---|
| `app/` はルートの定義だけを持つ。問い合わせと表示の中身は `features/` に書く | ルートの形と機能を分ける |
| `server/db` を読んでよいのは `features/*/data.ts` と `server/` だけ | 認可を通らない読み書きを作らない |
| `process.env` を読んでよいのは `src/env.ts` だけ | 検証していない値を使わない |
| ある機能が別の機能を使うときは、その機能の `data.ts`・`types.ts`・`components/` の公開している名前だけを使う | 機能の中の作りを変えやすくする |
| `lib/` は React とサーバーのどちらにも頼らない | どこからでも使え、単体で試せる |
| `'use client'` は葉の部品に付ける。ページとレイアウトは Server Component | クライアントへ送る量を小さくする |

ESLint の `no-restricted-imports` で、上の 2 行目と 3 行目を守らせる。

## 3. データアクセス層の書き方

全ての関数が、同じ順で行う。

1. `getSession()`（`server/session.ts`）で今のユーザーを得る。ログインが要る関数は、いなければ `UnauthorizedError` を投げる
2. その操作をしてよいかを確かめる（自分の投稿か、ブロックされていないか）。だめなら `ForbiddenError` を投げる
3. Drizzle で読む・書く。複数の表を書くときは 1 つのトランザクションにする
4. DTO にして返す。`bigint` の ID は文字列にする。パスワードのハッシュ・メールアドレス・内部の列を入れない

| 種類 | 名前の形 | 例 |
|---|---|---|
| 読み取り | `get…` / `list…` | `listHomeTimeline({ cursor })`、`getPost(id)`、`getProfile(username)` |
| 変更 | 動詞 | `createPost(input)`、`likePost(postId)`、`followUser(userId)` |

## 4. 読み取り・変更・キャッシュ

| 場面 | やり方 |
|---|---|
| ページの最初の描画 | Server Component がデータアクセス層を呼ぶ。リクエストごとに変わる部分は `<Suspense>` で包む |
| 一覧の続き | Route Handler（GET）を `useInfiniteQuery` から呼ぶ。最初のページは `initialData` で渡す |
| 新着と未読の確認 | Route Handler（GET）を `useQuery` の `refetchInterval`（30 秒）で呼ぶ（[ADR-0011](../adr/0011-polling-and-after-no-queue.md)） |
| 変更 | Server Action。Zod で確かめ、データアクセス層を呼び、結果の DTO を返す |
| 誰が見ても同じ読み取り | `'use cache'`・`cacheLife('minutes')`・`cacheTag(…)`。対象はトレンドとおすすめのユーザーだけ |
| ユーザーごとに違う読み取り | キャッシュしない |
| 変更のあとの描き直し | Server Component が描いた部分は `updateTag()` か `refresh()`。一覧は TanStack Query のキャッシュを書き換える |

エラーの扱い:

| 起きたこと | Server Action の戻り値 | Route Handler |
|---|---|---|
| 入力が正しくない | `{ ok: false, code: 'VALIDATION', fieldErrors }` | 400 |
| ログインしていない | `{ ok: false, code: 'UNAUTHORIZED' }` | 401 |
| してよい操作ではない | `{ ok: false, code: 'FORBIDDEN' }` | 403 |
| 見つからない | `{ ok: false, code: 'NOT_FOUND' }` | 404 |
| 回数の制限 | `{ ok: false, code: 'RATE_LIMITED' }` | 429 |
| 成功 | `{ ok: true, data }` | 200 |

Server Action は例外を投げずに、上の形で返す。想定していない例外だけを投げ、`error.tsx` で受ける。

## 5. サーバーのインターフェース

### Server Action

| 機能 | 関数 |
|---|---|
| `posts` | `createPost`、`deletePost`、`pinPost` |
| `engagement` | `likePost`、`unlikePost`、`repost`、`undoRepost`、`bookmarkPost`、`unbookmarkPost` |
| `follows` | `followUser`、`unfollowUser` |
| `profiles` | `updateProfile` |
| `notifications` | `markNotificationsRead` |
| `settings` | `updateDisplaySettings`（テーマとアクセント） |

登録・ログイン・ログアウトは、Better Auth のクライアントが `/api/auth/*` を呼ぶ。

### Route Handler

| メソッドとパス | 役割 |
|---|---|
| `GET /api/timeline/following?cursor=` | 「フォロー中」の続き |
| `GET /api/timeline/for-you?cursor=` | 「おすすめ」の続き |
| `GET /api/timeline/following/new-count?since=` | 新しい投稿の数 |
| `GET /api/users/{username}/posts?tab=&cursor=` | プロフィールの各タブの続き |
| `GET /api/posts/{id}/replies?cursor=` | 返信の続き |
| `GET /api/search?q=&f=&cursor=` | 検索の結果の続き |
| `GET /api/notifications?tab=&cursor=` | 通知の続き |
| `GET /api/notifications/unread-count` | 未読の数 |
| `GET /api/bookmarks?cursor=` | ブックマークの続き |
| `POST /api/uploads/presign` | 画像の署名つき URL を出す |
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
| 認証と認可は、Server Action と Route Handler のたびにデータアクセス層で行う。`proxy.ts` の確認に頼らない | `features/*/data.ts` |
| 入力は全部 Zod で確かめる。ルートの引数（`username`・`postId`）も確かめる | `features/*/schema.ts` |
| クライアントへ渡すのは DTO だけ | `features/*/types.ts` |
| セッションの cookie は HttpOnly・Secure・SameSite=Lax | `server/auth.ts` |
| 投稿・フォロー・画像の署名・ログインに回数の制限を付ける | `server/rate-limit.ts` |
| 本文は文字として出す。HTML として出さない。リンクは `twitter-text` で取り出して、`http` と `https` だけを許す | `features/posts/components/` |
| 画像は種類と大きさを署名の前に確かめ、サーバーで作り直したものだけを出す | `features/media/` |
| 秘密の値は環境変数だけに置き、`src/env.ts` で検証する。`NEXT_PUBLIC_` を付けるのは公開してよい値だけ | `src/env.ts` |
