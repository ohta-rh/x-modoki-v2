---
type: Architecture
title: "アーキテクチャの全体像"
description: "x-modoki の目的、全体の構成、主な処理の流れ、リスクを 1 枚で示す。"
tags: [architecture, overview]
status: stable
---

# アーキテクチャの全体像

- 作成日: 2026-11-18
- 決定の理由は各 ADR にある。この文書は今の姿だけを書く

## 1. 目的と範囲

x-modoki は、X（x.com）の Web 版の見た目と操作を可能な限り再現する、学習用のマイクロブログのアプリ。Next.js の 1 つのアプリに、画面とサーバーの処理を全部置く（[ADR-0004](../adr/0004-nextjs-16-all-in-one-app.md)）。

- 作る機能と作らない機能: [機能の範囲](scope.md)
- 見た目と操作: [UI/UX 仕様](ui-ux.md)（[ADR-0009](../adr/0009-mimic-x-ui-with-own-brand.md)）
- 想定する規模: 数十人から数千人。インスタンスは 1 つ

## 2. 全体の構成

```
 ブラウザ
   │  HTTPS
   ▼
 Caddy（HTTPS・逆プロキシ）
   │
   ▼
┌───────────────────────── Next.js 16.4（コンテナ 1 つ）─────────────────────────┐
│ proxy.ts              ログインしていなければログインへ送る（粗い門だけ）       │
│                                                                                │
│ app/（ルート）                                                                 │
│   Server Component ──────────────┐   最初の画面を描く                          │
│   Server Action（'use server'）──┤   変更                                      │
│   Route Handler（GET /api/…）───┤   続きの読み込み・新着の確認・署名つき URL  │
│                                  ▼                                             │
│ features/*/data.ts    データアクセス層（server-only・認可・DTO）               │
│                                  │                                             │
│ server/               Drizzle / Better Auth / S3Client / 回数の制限            │
└──────────────┬───────────────────┬─────────────────────────────────────────────┘
               ▼                   ▼
        PostgreSQL            S3 互換のストレージ ◀── ブラウザが署名つき URL で直接 PUT
   （データ・セッション・      （本番 Cloudflare R2 /
     回数の制限）               ローカル Garage）
```

| 部分 | 役割 | 決定 |
|---|---|---|
| Next.js 16.4（App Router） | 画面・変更・API の全部 | [ADR-0004](../adr/0004-nextjs-16-all-in-one-app.md) |
| データアクセス層 | データベースの読み書きと認可の唯一の場所 | [ADR-0010](../adr/0010-dal-server-actions-route-handlers.md) |
| PostgreSQL と Drizzle | データ・セッション・検索 | [ADR-0006](../adr/0006-postgresql-drizzle.md) |
| Better Auth | 登録・ログイン・セッション | [ADR-0007](../adr/0007-better-auth-db-sessions.md) |
| S3 互換のストレージ | 画像 | [ADR-0008](../adr/0008-s3-compatible-media-storage.md) |
| Docker Compose と Caddy | ローカルと本番の実行環境 | [ADR-0012](../adr/0012-single-container-docker-compose.md) |

詳しい構造は [アプリケーションの構造](application-structure.md)、版は [技術スタック](tech-stack.md)。

## 3. 主な処理の流れ

### 3.1 ホームのタイムラインを開く

```
ブラウザ           Next.js（Server Component）        データアクセス層        PostgreSQL
  │ GET /home          │                                   │                      │
  │───────────────────▶│ 骨格（ナビ・ヘッダー）をすぐ返す  │                      │
  │◀── 骨格（HTML）────│                                   │                      │
  │                    │ <Suspense> の中                   │                      │
  │                    │ getHomeTimeline()────────────────▶│ セッションを確かめる │
  │                    │                                   │ 20 件を取る─────────▶│
  │                    │◀──────────── DTO の配列 ──────────│◀─────────────────────│
  │◀── 最初の 20 件 ───│（initialData としてクライアントへ）                      │
  │                                                                               │
  │ 下まで行く: GET /api/timeline/following?cursor=…  ─▶ Route Handler ─▶ 同じ層  │
  │ 30 秒ごと: GET /api/timeline/following/new-count?since=… ─▶ 「N 件のポストを表示」
```

### 3.2 投稿する（画像つき）

```
ブラウザ                    Next.js                         ストレージ      PostgreSQL
  │ POST /api/uploads/presign  │ ログイン・枚数・種類・大きさ    │               │
  │───────────────────────────▶│ ・回数の制限を確かめる          │               │
  │◀── 署名つき URL と キー ───│ media（結びつく前）を作る──────────────────────▶│
  │ PUT（画像）────────────────────────────────────────────────▶│               │
  │ Server Action createPost({ text, mediaKeys })                │               │
  │───────────────────────────▶│ Zod で確かめる                  │               │
  │                            │ データアクセス層:               │               │
  │                            │  1 つのトランザクションで       │               │
  │                            │  posts・post_media・hashtags・  │               │
  │                            │  mentions・notifications を書く─────────────────▶│
  │                            │ sharp で WebP を作って置く─────▶│               │
  │◀── 新しい投稿の DTO ───────│                                 │               │
  │ タイムラインの先頭に足す。「ポストを送信しました」を出す                     │
```

### 3.3 いいねする

```
ブラウザ                                   Next.js                       PostgreSQL
  │ 押した直後に、キャッシュの中のその投稿を書き換える（色と数）              │
  │ Server Action likePost(postId)────────▶│ データアクセス層:                │
  │                                        │  1 つのトランザクションで        │
  │                                        │  likes に足す                    │
  │                                        │  posts.like_count を +1          │
  │                                        │  notifications に足す───────────▶│
  │◀── { likeCount, liked } ───────────────│                                  │
  │ 失敗したら、書き換えを戻してトーストを出す                                 │
```

### 3.4 タイムラインから投稿の画像を開く

```
/home で画像を押す
  → URL が /{username}/status/{id}/photo/1 に変わる
  → @modal のスロットの「途中で受けるルート」が、タイムラインの上にビューアを重ねる
  → 戻ると、タイムラインがスクロールの位置のまま残っている

同じ URL を直接開く・再読み込みする
  → 投稿の詳細のページの上に、ビューアを出す
```

## 4. 守ること（全体に効く規則）

| 規則 | 決定 |
|---|---|
| データベースを使うのはデータアクセス層だけ。認可はそこで毎回行う | [ADR-0010](../adr/0010-dal-server-actions-route-handlers.md) |
| 変更は Server Action、続きの読み込みは Route Handler | [ADR-0010](../adr/0010-dal-server-actions-route-handlers.md) |
| 投稿の ID は外では文字列 | [ADR-0016](../adr/0016-time-ordered-64bit-post-ids.md) |
| 通知の行は元の操作と同じトランザクションで書く | [ADR-0011](../adr/0011-polling-and-after-no-queue.md) |
| X の名前・ロゴ・素材・実在の投稿を使わない | [ADR-0009](../adr/0009-mimic-x-ui-with-own-brand.md) |
| 決めたら ADR を書く。文書は OKF の形で `docs/` に置く | [ADR-0001](../adr/0001-record-architecture-decisions.md)、[ADR-0002](../adr/0002-docs-as-okf-bundle.md) |

## 5. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| Better Auth が Next.js 16.4 で動くことを試していない | 高 | 最初の EPIC で、登録・ログイン・`proxy.ts`・Server Action でのセッションの読み出しを確かめる。動かなければ [ADR-0007](../adr/0007-better-auth-db-sessions.md) を置き換える |
| Garage のイメージと版を確かめていない | 中 | 最初の EPIC で、Docker Compose での起動と署名つき URL での PUT を確かめる。通らなければ SeaweedFS に替える。コードは S3 互換のまま |
| Cache Components で、リクエストごとのデータを `<Suspense>` で包み忘れる | 中 | ビルドでエラーになるので、`next build` を確認の 1 つにする |
| Server Action が認可を通らずに呼ばれる | 高 | 認可はデータアクセス層にしか書かない。他人の投稿・他人のアカウントへの操作を、本物の PostgreSQL のテストで確かめる（[ADR-0013](../adr/0013-vitest-playwright-testing.md)） |
| Drizzle が 1.0 の前で、上げると壊れる変更がある | 中 | 版を固定する。1.0 が出たら ADR を書いて上げる |
| `pg_trgm` は 2 文字以下の語に弱い | 低 | ハッシュタグは完全一致の表で引く。足りなくなったら PGroonga を検討する |
| X の UI の値の多くが近似 | 低 | 値と確度を [UI/UX 仕様](ui-ux.md) に書き、見た目で調整する |
| 見た目が X に似ていることを指摘される | 中 | 名前・ロゴ・素材は自前。関係が無い旨を表示する。公開の前にアクセントの色を見直す |
| 1 台の VPS が止まるとアプリが止まる | 低 | 学習用として受け入れる。`pg_dump` を 1 日に 1 回 R2 に置く |

## 6. あとで考えること

- ダイレクトメッセージと、そのための Server-Sent Events
- 「おすすめ」の点数での並べ替え
- 投票・予約投稿・GIF・動画
- メールの確認、Google と GitHub でのログイン、パスキー
- PGroonga による日本語の検索
- TypeScript 7、Drizzle 1.0 への移行
- 複数のインスタンスと共有のキャッシュ
