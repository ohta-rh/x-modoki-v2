---
type: Architecture
title: "技術スタック"
description: "使う技術と版（2026-11-18 に npm レジストリで確認）、それぞれを決めた ADR、月の費用の見積もりを示す。"
tags: [architecture, tech-stack, versions]
status: stable
---

# 技術スタック

- 版を確認した日: 2026-11-18（`npm view <package> version`）
- 版は、公開から 7 日以上たったものに正確に固定する（[ADR-0032](../adr/0032-pin-dependencies-published-at-least-seven-days-ago.md)）。正確な版は `package.json`。この表はマイナーの系列を示す。上げるときは、[ADR-0005](../adr/0005-toolchain-node24-pnpm-ts6-eslint.md) の手順で 1 つずつ上げる

## 1. 実行環境と道具

| 役割 | 選んだもの | 版 | 決定 |
|---|---|---|---|
| 実行環境 | Node.js | 24 LTS | [ADR-0005](../adr/0005-toolchain-node24-pnpm-ts6-eslint.md) |
| パッケージの管理 | pnpm（`minimumReleaseAge` で公開から 7 日未満の版を入れない。[ADR-0032](../adr/0032-pin-dependencies-published-at-least-seven-days-ago.md)） | 12.19.0 | [ADR-0005](../adr/0005-toolchain-node24-pnpm-ts6-eslint.md) |
| 言語 | TypeScript | 6.0.x（7 は使わない） | [ADR-0005](../adr/0005-toolchain-node24-pnpm-ts6-eslint.md) |
| lint | ESLint と `eslint-config-next`、Steiger と `@feature-sliced/steiger-plugin` | 10.14.x / 16.4.x、0.10.x / 0.8.x | [ADR-0005](../adr/0005-toolchain-node24-pnpm-ts6-eslint.md) |
| 整形 | Prettier（`prettier-plugin-tailwindcss` は #17 で足す） | 3.9.10 | [ADR-0005](../adr/0005-toolchain-node24-pnpm-ts6-eslint.md) |
| 構造のリンター | Steiger と `@feature-sliced/steiger-plugin`（Feature-Sliced Design） | 0.10.x / 0.8.x | [ADR-0022](../adr/0022-feature-sliced-design.md) |

## 2. アプリ

| 役割 | 選んだもの | 版 | 決定 |
|---|---|---|---|
| フレームワーク | Next.js（App Router・Cache Components・Turbopack） | 16.4.x | [ADR-0004](../adr/0004-nextjs-16-all-in-one-app.md) |
| UI | React / React DOM | 19.3.x | [ADR-0004](../adr/0004-nextjs-16-all-in-one-app.md) |
| スタイル | Tailwind CSS と `@tailwindcss/postcss`、`tw-animate-css`、`prettier-plugin-tailwindcss` | 4.3.5 / 1.4.0 / 0.8.1 | [ADR-0014](../adr/0014-tailwind-shadcn-base-ui.md) |
| 部品の土台 | shadcn のレジストリ（Base UI 版、`src/shared/ui/kit/` に取り込む）と `@base-ui/react`、`class-variance-authority`・`clsx`・`tailwind-merge` | 1.9.0 / 0.7.1 / 2.1.1 / 3.7.0 | [ADR-0014](../adr/0014-tailwind-shadcn-base-ui.md)・[ADR-0035](../adr/0035-vendor-shadcn-from-registry-and-base-ui-toast.md) |
| アイコン | `lucide-react` | 1.71.0 | [ADR-0014](../adr/0014-tailwind-shadcn-base-ui.md) |
| クライアントのデータ | `@tanstack/react-query` | 5.107.x | [ADR-0010](../adr/0010-dal-server-actions-route-handlers.md) |
| 一覧の仮想化 | `@tanstack/react-virtual` | 3.14.x | [UI/UX 仕様](ui-ux.md) |
| 文字数 | `twitter-text` | 3.1.x | [ADR-0009](../adr/0009-mimic-x-ui-with-own-brand.md) |
| 入力の検証 | Zod | 4.6.x | [ADR-0010](../adr/0010-dal-server-actions-route-handlers.md) |
| 環境変数の検証 | `@t3-oss/env-nextjs` | 0.13.x | [環境と配備](environments.md) |
| サーバーだけの境界 | `server-only` | 0.0.1 | [ADR-0010](../adr/0010-dal-server-actions-route-handlers.md) |

## 3. データと外の部分

| 役割 | 選んだもの | 版 | 決定 |
|---|---|---|---|
| データベース | PostgreSQL（公式の Docker のイメージ）と `pg_trgm` | 18 | [ADR-0006](../adr/0006-postgresql-drizzle.md) |
| ORM | `drizzle-orm` と `drizzle-kit` | 0.45.x / 0.31.x | [ADR-0006](../adr/0006-postgresql-drizzle.md) |
| ドライバー | `pg`（node-postgres） | 8.23.x | [ADR-0006](../adr/0006-postgresql-drizzle.md) |
| 認証 | `better-auth`（Drizzle のアダプター、`username` のプラグイン） | 1.7.x | [ADR-0007](../adr/0007-better-auth-db-sessions.md) |
| 画像の置き場所 | Cloudflare R2（本番）/ Garage（ローカル） | — | [ADR-0008](../adr/0008-s3-compatible-media-storage.md) |
| ストレージのクライアント | `@aws-sdk/client-s3` と `@aws-sdk/s3-request-presigner` | 3.x | [ADR-0008](../adr/0008-s3-compatible-media-storage.md) |
| 画像の変換 | ブラウザの `createImageBitmap` と `OffscreenCanvas`（ライブラリ無し） | — | [ADR-0018](../adr/0018-resize-images-in-browser.md) |
| 本番の実行環境 | Cloudflare Workers と `@opennextjs/cloudflare`・`wrangler` | 1.20.x / 4.x | [ADR-0017](../adr/0017-cloudflare-workers-opennext.md) |
| 本番のデータベース | Neon（PostgreSQL）を Cloudflare Hyperdrive でつなぐ | — | [ADR-0017](../adr/0017-cloudflare-workers-opennext.md) |
| ローカルと CI | Docker Compose（PostgreSQL と Garage） | — | [ADR-0019](../adr/0019-first-milestone-runs-locally.md) |
| CI | GitHub Actions | — | [ADR-0073](../adr/0073-ci-scope-docs-only-and-e2e-per-browser.md)、[ADR-0071](../adr/0071-dependabot-weekly-updates-pinned-lines-by-adr.md) |

PostgreSQL の 18 は、イメージのタグを実装のときに確かめて固定する。`@opennextjs/cloudflare` と `wrangler` を入れるのはマイルストーン 2。

## 4. テスト

| 役割 | 選んだもの | 版 | 決定 |
|---|---|---|---|
| 単体・データアクセス層 | Vitest と `@vitejs/plugin-react` | 5.1.x / 6.3.x | [ADR-0013](../adr/0013-vitest-playwright-testing.md) |
| カバレッジ（しきい値 100%） | `@vitest/coverage-v8` | 5.1.x | [ADR-0021](../adr/0021-coverage-100-percent.md) |
| コンポーネント | `@testing-library/react`・`@testing-library/dom`・`@testing-library/user-event`・`@testing-library/jest-dom`・jsdom | 16.3.x / 10.4.x / 14.6.9 / 7.0.1 / 31.0.0 | [ADR-0013](../adr/0013-vitest-playwright-testing.md) |
| 画面を通したテスト | `@playwright/test` | 1.65.0 | [ADR-0013](../adr/0013-vitest-playwright-testing.md) |

## 5. 使わないと決めたもの

| 使わないもの | 理由 | 決定 |
|---|---|---|
| 別の API サーバー、tRPC | 1 つのアプリにまとめる | [ADR-0004](../adr/0004-nextjs-16-all-in-one-app.md)、[ADR-0010](../adr/0010-dal-server-actions-route-handlers.md) |
| TypeScript 7、Biome | typescript-eslint が TypeScript 7 に対応していない | [ADR-0005](../adr/0005-toolchain-node24-pnpm-ts6-eslint.md) |
| Prisma、Drizzle 1.0 の RC | SQL を直接書く場面が多い。正式版ではない | [ADR-0006](../adr/0006-postgresql-drizzle.md) |
| Auth.js、Clerk、Lucia | 保守だけの状態、外のサービスへの依存、非推奨 | [ADR-0007](../adr/0007-better-auth-db-sessions.md) |
| MinIO、Vercel Blob、`next/image` の最適化 | 保守の終了、ホスティングへの依存、費用と負荷 | [ADR-0008](../adr/0008-s3-compatible-media-storage.md) |
| vinext | Next.js そのものではない | [ADR-0017](../adr/0017-cloudflare-workers-opennext.md) |
| `sharp`、VPS と Caddy、`output: 'standalone'` | Workers で動かない・本番を Cloudflare にした | [ADR-0017](../adr/0017-cloudflare-workers-opennext.md)、[ADR-0018](../adr/0018-resize-images-in-browser.md) |
| Cloudflare D1 | PostgreSQL のトランザクションと検索を使う | [ADR-0017](../adr/0017-cloudflare-workers-opennext.md) |
| WebSocket、Server-Sent Events、ジョブのキュー | 今の要件には要らない | [ADR-0011](../adr/0011-polling-and-after-no-queue.md) |
| MUI などの見た目が決まった部品、CSS-in-JS | 見た目を 1px の単位で決めたい | [ADR-0014](../adr/0014-tailwind-shadcn-base-ui.md) |
| Jest、Cypress | Vitest と Playwright で足りる | [ADR-0013](../adr/0013-vitest-playwright-testing.md) |
| React Compiler | 既定が無効で、ビルドが遅くなる | [ADR-0004](../adr/0004-nextjs-16-all-in-one-app.md) |

## 6. 月の費用の見積もり（USD）

料金は 2026-11-18 に各社の料金のページで確認した値。出典は [Cloudflare Workers で動かす方法の調査](../research/cloudflare.md) と [バックエンド技術選定](../research/backend.md)。

| 構成 | 内訳 | 月の費用 |
|---|---|---|
| ローカルの開発 | Docker Compose だけ | $0 |
| CI | GitHub Actions（公開のリポジトリは無料） | $0 |
| **本番（採用）** | Cloudflare Workers Paid $5（Hyperdrive を含む）、Neon Free $0、Cloudflare R2 は 10GB まで $0 | **約 $5** |
| 参考: Workers Free | 1 リクエストの CPU が 10 ミリ秒までで、サーバーで描くページには足りない見込み（測っていない） | $0 |
| 参考: VPS 1 台と Docker Compose | 約 $6〜7（€5.49。性能は未確認） | 約 $6〜7 |
| 参考: Vercel Hobby と Neon Free と R2 | 全部 $0。非商用に限られる | $0 |
| 参考: Vercel Pro と Neon Launch と R2 | Vercel $20、Neon 約 $0〜15、R2 $0〜1 | 約 $20〜36 |
| 参考: Fly.io と自分で動かす PostgreSQL | 1GB の機械 $6.70 が 2 つと、ボリューム | 約 $14 |

ドメインの費用は含めていない。
