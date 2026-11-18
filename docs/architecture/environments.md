---
type: Architecture
title: "環境と配備"
description: "ローカルと本番の構成、環境変数、起動と配備の流れ、確認のコマンドを示す。"
tags: [architecture, deployment, environment]
status: stable
---

# 環境と配備

- 決定: [ADR-0017](../adr/0017-cloudflare-workers-opennext.md)、[ADR-0019](../adr/0019-first-milestone-runs-locally.md)、[ADR-0020](../adr/0020-ci-required-github-actions.md)、[ADR-0008](../adr/0008-s3-compatible-media-storage.md)、[ADR-0005](../adr/0005-toolchain-node24-pnpm-ts6-eslint.md)
- リポジトリにコードが入る前の設計。コマンドの名前は、最初の PBI で `package.json` に入れるときにこの表に合わせる

## 1. マイルストーンと環境

| マイルストーン | 終わりの条件 | 使う環境 |
|---|---|---|
| 1. ローカルで全部が動く | 最初の版の機能がローカルで全部動く。CI が通る。カバレッジが 100% | ローカル、CI |
| 2. Cloudflare で動く | Workers の上で同じ機能が動く。配備が決まった手順でできる | プレビュー、本番 |

マイルストーン 1 では、Cloudflare のアカウントも Wrangler の設定も要らない（[ADR-0019](../adr/0019-first-milestone-runs-locally.md)）。

## 2. 構成

| 部分 | ローカル | CI | プレビュー（マイルストーン 2） | 本番（マイルストーン 2） |
|---|---|---|---|---|
| Next.js | `pnpm dev` | `pnpm build` して `pnpm start` | `opennextjs-cloudflare preview`（手元の Workers の実行環境） | Cloudflare Workers（`@opennextjs/cloudflare`） |
| PostgreSQL | Docker Compose（`xmodoki`） | サービスのコンテナ（`xmodoki_test`） | ローカルの PostgreSQL を Hyperdrive の `localConnectionString` で指す | Neon を Hyperdrive でつなぐ |
| 画像の置き場所 | Docker Compose の Garage | サービスのコンテナ | ローカルの Garage | Cloudflare R2 |
| 定期的な処理 | 手で呼ぶ | 無し | 手で呼ぶ | Cron Triggers が 1 日に 1 回呼ぶ |
| HTTPS | 無し（`http://localhost:3000`） | 無し | 無し | Cloudflare |

## 3. 環境変数

全部 `src/shared/config/env.ts` で検証する。足りない・形が違うときは、起動とビルドが失敗する。

| 変数 | ローカルの例 | 意味 |
|---|---|---|
| `DATABASE_URL` | `postgres://xmodoki:xmodoki@localhost:5432/xmodoki` | PostgreSQL の接続先。本番では Hyperdrive のバインディングから得る |
| `BETTER_AUTH_SECRET` | 32 バイト以上の乱数 | セッションの署名 |
| `BETTER_AUTH_URL` | `http://localhost:3000` | アプリの URL |
| `S3_ENDPOINT` | `http://localhost:3900` | S3 互換の接続先 |
| `S3_REGION` | `garage`（本番は `auto`） | |
| `S3_BUCKET` | `xmodoki-media` | |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | | |
| `S3_FORCE_PATH_STYLE` | `true`（本番は `false`） | |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | `http://localhost:3902` | 画像を読むときの公開の URL。アプリとは別のドメインにする |
| `CRON_SECRET` | 乱数 | 定期的な処理の Route Handler を守る |

- `.env.example` をリポジトリに入れる。`.env` と `.env.local` は入れない
- `NEXT_PUBLIC_` を付けるのは、ブラウザに見せてよい値だけ
- 本番の秘密の値は、Wrangler の secret に置く。リポジトリにも CI のログにも出さない

## 4. コマンド

| コマンド | すること |
|---|---|
| `docker compose up -d` | PostgreSQL と Garage を立ち上げる |
| `pnpm install` | 依存を入れる |
| `pnpm db:generate` | スキーマの差分からマイグレーションの SQL を作る |
| `pnpm db:migrate` | マイグレーションを流す |
| `pnpm db:seed` | 架空のユーザーと投稿を入れる |
| `pnpm dev` | 開発のサーバー |
| `pnpm docs:check` | `node scripts/check-docs.mjs`。`docs/` の OKF の形・リンク・ADR のステータスを確かめる |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | `eslint` と `steiger ./src`（FSD の層と公開 API。[ADR-0022](../adr/0022-feature-sliced-design.md)） |
| `pnpm format:check` | `prettier --check .` |
| `pnpm test` | Vitest（単体とデータアクセス層）。`--coverage` でカバレッジ |
| `pnpm test:e2e` | Playwright |
| `pnpm build` | `next build` |
| `pnpm verify` | 上の 7 つの確認を、CI と同じ順で全部動かす |

## 5. 最初に動かすまで

```
docker compose up -d
cp .env.example .env.local
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev            # http://localhost:3000
```

## 6. CI

GitHub Actions が、`main` への push と全ての PR で動かす（[ADR-0020](../adr/0020-ci-required-github-actions.md)）。

| 順 | 確認 | コマンド | 落ちる条件 |
|---|---|---|---|
| 1 | ドキュメント | `pnpm docs:check` | frontmatter の `type` が無い、リンクが切れている、ADR のステータスがずれている |
| 2 | 型 | `pnpm typecheck` | 型のエラー |
| 3 | lint | `pnpm lint` | ESLint の警告を含む全ての指摘、FSD の層・公開 API の違反 |
| 4 | 整形 | `pnpm format:check` | 整形されていないファイル |
| 5 | テストとカバレッジ | `pnpm test --coverage` | テストの失敗、または行・分岐・関数・文のどれかが 100% 未満（[ADR-0021](../adr/0021-coverage-100-percent.md)） |
| 6 | ビルド | `pnpm build` | ビルドのエラー（`<Suspense>` の包み忘れを含む） |
| 7 | 画面を通したテスト | `pnpm test:e2e` | Chromium・Firefox・WebKit のどれかでのテストの失敗。最初の失敗で止める。失敗のときは、画面の写真と操作の記録を成果物に残す |

- PostgreSQL と S3 互換のストレージは、CI のサービスのコンテナで動かす
- Node.js と pnpm の版は、`.nvmrc` と `package.json` の `packageManager` から読む
- 手元では `pnpm verify` が同じ 7 つを動かす。通してから push し、push のあと CI の結果を最後まで見る
- CI が緑でも、完了ではない。`pnpm build && pnpm start` のアプリを本物の Chrome で操作して確かめ、エビデンスつきの試験レポートを `docs/test-reports/` に残すまでが完了（[ADR-0024](../adr/0024-definition-of-done-requires-browser-testing.md)、[ADR-0025](../adr/0025-test-report-with-evidence.md)）

## 7. 本番への配備（マイルストーン 2 で作る）

```
1. マイグレーションを流す（アプリを替える前）
2. opennextjs-cloudflare build
3. opennextjs-cloudflare deploy
4. /api/health が 200 を返すことを確かめる
```

- 配備を CI から自動で行うかは、マイルストーン 2 で ADR を書いて決める
- マイグレーションは、前の版のアプリが動いたままでも壊れない形で書く（列を消すのは、使うコードを消した次の配備）
- マイルストーン 2 の最初の PBI で、Cache Components・`proxy.ts`・Better Auth・Hyperdrive 経由の Drizzle が Workers の実行環境で動くことを確かめる（[ADR-0017](../adr/0017-cloudflare-workers-opennext.md)）

## 8. サーバーのコードに入れないもの

本番が Cloudflare Workers なので、マイルストーン 1 の間も次のものを入れない（[ADR-0017](../adr/0017-cloudflare-workers-opennext.md)）。

| 入れないもの | 代わり |
|---|---|
| ネイティブのモジュール（`sharp` など） | 画像はブラウザで変換する（[ADR-0018](../adr/0018-resize-images-in-browser.md)） |
| `fs` への書き込み | S3 互換のストレージ、PostgreSQL |
| モジュールの一番上で作る接続・プール | `getDb()` でリクエストごとに作る |
| リクエストをまたいで値を持つモジュールの変数（メモリの中のキャッシュ、回数の制限） | PostgreSQL、`'use cache'` |
| `setInterval` や、保ち続ける接続 | 定期的な GET、Cron Triggers |
