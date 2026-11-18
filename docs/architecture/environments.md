---
type: Architecture
title: "環境と配備"
description: "ローカルと本番の構成、環境変数、起動と配備の流れ、確認のコマンドを示す。"
tags: [architecture, deployment, environment]
status: stable
---

# 環境と配備

- 決定: [ADR-0012](../adr/0012-single-container-docker-compose.md)、[ADR-0008](../adr/0008-s3-compatible-media-storage.md)、[ADR-0005](../adr/0005-toolchain-node24-pnpm-ts6-eslint.md)
- リポジトリにコードが入る前の設計。コマンドの名前は、最初の EPIC で `package.json` に入れるときにこの表に合わせる

## 1. 構成

| 部分 | ローカル | テスト | 本番 |
|---|---|---|---|
| Next.js | `pnpm dev`（ホストで動かす） | `pnpm build` して `pnpm start` | コンテナ（`output: 'standalone'`） |
| PostgreSQL | Docker Compose（データベース `xmodoki`） | 同じコンテナの別のデータベース（`xmodoki_test`） | コンテナ。データはボリュームに置く |
| 画像の置き場所 | Docker Compose の Garage | 同じ Garage の別のバケット | Cloudflare R2 |
| 逆プロキシ | 無し（`http://localhost:3000`） | 無し | Caddy（HTTPS） |
| 定期的な処理 | 手で呼ぶ | 無し | ホストの cron が 1 日に 1 回呼ぶ |

## 2. 環境変数

全部 `src/env.ts` で検証する。足りない・形が違うときは、起動とビルドが失敗する。

| 変数 | 例 | 意味 |
|---|---|---|
| `DATABASE_URL` | `postgres://xmodoki:xmodoki@localhost:5432/xmodoki` | PostgreSQL の接続先 |
| `BETTER_AUTH_SECRET` | 32 バイト以上の乱数 | セッションの署名 |
| `BETTER_AUTH_URL` | `http://localhost:3000` | アプリの URL |
| `S3_ENDPOINT` | `http://localhost:3900` | S3 互換の接続先 |
| `S3_REGION` | `garage` / `auto` | |
| `S3_BUCKET` | `xmodoki-media` | |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | | |
| `S3_FORCE_PATH_STYLE` | `true`（Garage）/ `false`（R2） | |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | `http://localhost:3902` | 画像を読むときの公開の URL |
| `CRON_SECRET` | 乱数 | 定期的な処理の Route Handler を守る |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | base64 の 32 バイト | 本番だけ。再配備をまたいで Server Action を呼べるようにする |

- `.env.example` をリポジトリに入れる。`.env` と `.env.local` は入れない
- `NEXT_PUBLIC_` を付けるのは、ブラウザに見せてよい値だけ

## 3. コマンド

| コマンド | すること |
|---|---|
| `docker compose up -d` | PostgreSQL と Garage を立ち上げる |
| `pnpm install` | 依存を入れる |
| `pnpm db:generate` | スキーマの差分からマイグレーションの SQL を作る |
| `pnpm db:migrate` | マイグレーションを流す |
| `pnpm db:seed` | 架空のユーザーと投稿を入れる |
| `pnpm dev` | 開発のサーバー |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | `eslint` |
| `pnpm format:check` | `prettier --check .` |
| `pnpm test` | Vitest（単体とデータアクセス層） |
| `pnpm test:e2e` | Playwright |
| `pnpm build` | `next build` |

「全部通った」は、`typecheck`・`lint`・`format:check`・`test`・`test:e2e`・`build` の 6 つが通ったとき（[ADR-0013](../adr/0013-vitest-playwright-testing.md)）。

## 4. 最初に動かすまで

```
docker compose up -d
cp .env.example .env.local
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev            # http://localhost:3000
```

## 5. 本番への配備

```
1. main に push する
2. VPS で: git pull → docker compose -f compose.prod.yml build
3. マイグレーションを流す（アプリを替える前）
4. docker compose -f compose.prod.yml up -d
5. /api/health が 200 を返すことを確かめる
```

- 配備を自動にするか（GitHub Actions から VPS へ）は、配備の EPIC で ADR を書いて決める
- マイグレーションは、前の版のアプリが動いたままでも壊れない形で書く（列を消すのは、使うコードを消した次の配備）
- `pg_dump` を 1 日に 1 回取り、R2 の別のバケットに置く。戻す手順を 1 回試してから運用を始める
- コンテナは SIGTERM を受けてから 30 秒待って止める（`after()` の処理が終わるのを待つ）
