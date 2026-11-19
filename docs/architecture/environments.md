---
type: Architecture
title: "環境と配備"
description: "ローカルと本番の構成、環境変数、起動と配備の流れ、確認のコマンドを示す。"
tags: [architecture, deployment, environment]
status: stable
---

# 環境と配備

- 決定: [ADR-0017](../adr/0017-cloudflare-workers-opennext.md)、[ADR-0019](../adr/0019-first-milestone-runs-locally.md)、[ADR-0070](../adr/0070-ci-has-eight-gates-with-the-dependency-audit.md)、[ADR-0008](../adr/0008-s3-compatible-media-storage.md)、[ADR-0005](../adr/0005-toolchain-node24-pnpm-ts6-eslint.md)
- 手を動かす手順は [ローカルで動かす](../guides/local-development.md)。この文書は構成と、コマンドの一覧（`package.json` の `scripts` と同じ）を示す

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
| PostgreSQL | Docker Compose（`xmodoki`、`max_connections` 300: 画面のテストの並列のため、#49） | 同じ Docker Compose（`scripts/setup-local.sh` で立ち上げる） | ローカルの PostgreSQL を Hyperdrive の `localConnectionString` で指す | Neon を Hyperdrive でつなぐ |
| 画像の置き場所 | Docker Compose の Garage | 同じ Docker Compose | ローカルの Garage | Cloudflare R2 |
| 定期的な処理 | 手で呼ぶ | 無し | 手で呼ぶ | Cron Triggers が 1 日に 1 回呼ぶ |
| HTTPS | 無し（`http://localhost:3000`） | 無し | 無し | Cloudflare |

## 3. 環境変数

全部 `src/shared/config/env.ts` で検証する。足りない・形が違うときは、起動とビルドが失敗する。

| 変数 | ローカルの例 | 意味 |
|---|---|---|
| `DATABASE_URL` | `postgres://xmodoki:xmodoki@localhost:54320/xmodoki` | PostgreSQL の接続先。本番では Hyperdrive のバインディングから得る |
| `BETTER_AUTH_SECRET` | 32 バイト以上の乱数 | セッションの署名 |
| `BETTER_AUTH_URL` | `http://localhost:3000` | アプリの URL |
| `S3_ENDPOINT` | `http://localhost:3900` | S3 互換の接続先 |
| `S3_REGION` | `garage`（本番は `auto`） | |
| `S3_BUCKET` | `xmodoki-media` | |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | | |
| `S3_FORCE_PATH_STYLE` | `true`（本番は `false`） | |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | `http://xmodoki-media.web.garage.localhost:3902`（Garage はホスト名でバケットを選ぶ） | 画像を読むときの公開の URL。アプリとは別のドメインにする |
| `CRON_SECRET` | 乱数 | 定期的な処理の Route Handler を守る |
| `AUTH_RATE_LIMIT_PER_MINUTE` | 省略（既定 10） | 登録とログインの、IP ごとの 1 分の回数。Playwright のサーバーだけ 1000（[ADR-0036](../adr/0036-auth-rate-limit-configurable-for-e2e.md)） |

- `.env.example` をリポジトリに入れる。`.env` と `.env.local` は入れない
- `NEXT_PUBLIC_` を付けるのは、ブラウザに見せてよい値だけ
- 本番の秘密の値は、Wrangler の secret に置く。リポジトリにも CI のログにも出さない

## 4. コマンド

| コマンド | すること |
|---|---|
| `sh scripts/setup-local.sh` | 初めての準備と、毎回の立ち上げ。Garage の設定を作り、PostgreSQL と Garage（macOS では画面のテストの WebKit も: [ADR-0052](../adr/0052-local-webkit-in-the-playwright-image.md)）を立ち上げ、バケットとキーを作り、`.env.local` の空の値を埋め、バケットの CORS で `http://localhost:3000` と `http://localhost:3300` からの PUT を許す（`scripts/storage-cors.mjs`。ブラウザが署名つき URL へ直接送るため、#25）。何度流してもよい（`docker compose up -d` だけでは、Garage の設定が無くて立ち上がらない） |
| `pnpm install` | 依存を入れる |
| `pnpm db:generate` | スキーマの差分からマイグレーションの SQL を作る |
| `pnpm db:migrate` | マイグレーションを流す |
| `pnpm db:seed` | 架空の 20 人（パスワードは全員 `sample-password`。[ADR-0068](../adr/0068-seed-people-sign-in-with-a-published-dev-password.md)）・投稿 300 件・フォロー・いいねを入れる。もう人がいれば何もしない（手で作ったデータを消さない） |
| `pnpm dev` | 開発のサーバー |
| `pnpm start` | `pnpm build` のあとの本番の形のサーバー（`next start`）。画面のテストと Chrome での確認はこちら |
| `pnpm docs:check` | `node scripts/check-docs.mjs && node scripts/check-traceability.mjs`。`docs/` の OKF の形・リンク・ADR のステータスと、要件とテストの結びつき（[ADR-0053](../adr/0053-requirements-trace-to-tests.md)）を確かめる |
| `pnpm typecheck` | `next typegen && tsc --noEmit`（ルートの型を作ってから確かめる） |
| `pnpm lint` | `eslint --max-warnings 0 .`・`steiger ./src`・`node scripts/check-src-layers.mjs`・`node scripts/check-authz.mjs`（FSD の層と公開 API と `src/` の直下。[ADR-0022](../adr/0022-feature-sliced-design.md)・[ADR-0030](../adr/0030-fsd-lint-exceptions-and-own-layer-check.md)） |
| `pnpm format` | `prettier --write .` |
| `pnpm format:check` | `prettier --check .` |
| `pnpm test` | Vitest（単体とデータアクセス層）。`--coverage` でカバレッジ |
| `pnpm test:e2e` | Playwright。macOS では WebKit だけ `docker compose` の `webkit`（CI と同じイメージ）につなぐ（[ADR-0052](../adr/0052-local-webkit-in-the-playwright-image.md)） |
| `pnpm build` | `next build` |
| `pnpm verify` | 上の 7 つの確認を、CI と同じ順で全部動かす |

## 5. 最初に動かすまで

```
pnpm install
sh scripts/setup-local.sh   # Garage の設定・コンテナ・バケットとキー・.env.local
pnpm db:migrate
pnpm db:seed
pnpm dev                    # http://localhost:3000（使われていれば PORT=3300 pnpm dev）
```

- 同じ手順を [ローカルで動かす](../guides/local-development.md) に書き、CI の `fresh-clone` のジョブがまっさらなランナーでそこから読み出して流す（[ADR-0069](../adr/0069-ci-runs-the-local-guide-on-a-fresh-clone.md)）

- ホストのポート: PostgreSQL は 54320（5432 と重ならないように）、Garage は 3900（S3）と 3902（公開の URL）
- 手元の pnpm が 12 でないときは `npx -y pnpm@12.19.0 <コマンド>` で動かす（pnpm 10 からの自動の切り替えは失敗する。[Better Auth の調査](../research/better-auth-on-next-16.md) の 3.4）
- `scripts/setup-local.sh` は何度流してもよい。Garage の秘密の値は、機械ごとに乱数で作る（リポジトリには入れない）

## 6. CI

GitHub Actions が、`main` への push と全ての PR で動かす（[ADR-0070](../adr/0070-ci-has-eight-gates-with-the-dependency-audit.md)。ADR-0020 を置き換え）。依存の更新の PR は Dependabot が週に 1 回作る（[ADR-0071](../adr/0071-dependabot-weekly-updates-pinned-lines-by-adr.md)）。

| 順 | 確認 | コマンド | 落ちる条件 |
|---|---|---|---|
| 8（最初に動かす） | 本番の依存の監査 | `pnpm audit --prod --audit-level high` | 本番の依存に、高か重大の脆弱性がある（ビルドが要らないので最初に動かし、数秒で止める） |
| 1 | ドキュメント | `pnpm docs:check` | frontmatter の `type` が無い、リンクが切れている、ADR のステータスがずれている |
| 2 | 型 | `pnpm typecheck` | 型のエラー |
| 3 | lint | `pnpm lint` | ESLint の警告を含む全ての指摘、FSD の層・公開 API の違反 |
| 4 | 整形 | `pnpm format:check` | 整形されていないファイル |
| 5 | テストとカバレッジ | `pnpm test --coverage`（CI ではイメージの中で: [ADR-0047](../adr/0047-ci-steps-that-launch-a-browser-run-in-the-playwright-image.md)） | テストの失敗、または行・分岐・関数・文のどれかが 100% 未満（[ADR-0021](../adr/0021-coverage-100-percent.md)） |
| 6 | ビルド | `pnpm build` | ビルドのエラー（`<Suspense>` の包み忘れを含む） |
| 7 | 画面を通したテスト | `pnpm test:e2e`（CI では公式の Playwright のイメージの中で、ランナーの Node.js で: [ADR-0046](../adr/0046-ci-browser-tests-in-the-official-playwright-image.md)） | Chromium・Firefox・WebKit のどれかでのテストの失敗。最初の失敗で止める。失敗のときは、画面の写真と操作の記録を成果物に残す |

- PostgreSQL と S3 互換のストレージは、CI でも `scripts/setup-local.sh` の Docker Compose で動かす。GitHub Actions の `services:` は、リポジトリの Garage の設定をマウントする前に立ち上がるので使わない。手元と CI が同じ手順になる（[ADR-0033](../adr/0033-ci-services-via-docker-compose.md)）
- Node.js と pnpm の版は、`.nvmrc` と `package.json` の `packageManager` から読む
- 手元では `pnpm verify` が 1〜7 を動かす（監査は CI だけ。結果が変更ではなく脆弱性のデータベースで決まるため）。別のジョブ `fresh-clone` が、まっさらな clone で手順書を流す（[ADR-0069](../adr/0069-ci-runs-the-local-guide-on-a-fresh-clone.md)）。通してから push し、push のあと CI の結果を最後まで見る
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
