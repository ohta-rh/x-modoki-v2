---
type: Research
title: "マイルストーン 1 の速さの計測（#32）"
description: "ローカルの本番ビルドで 5 つの主な画面の LCP・CLS・TBT、ホームの問い合わせの回数、最初に送る JavaScript、投稿 10 万件での「フォロー中」の問い合わせを測り、予算を超えた JavaScript の量を直した前と後の値。"
tags: [performance, lighthouse, javascript, postgres]
status: stable
---

# マイルストーン 1 の速さの計測（#32）

## 調査日: 2026-11-19

## 1. 測った環境

- macOS 26.2、Node.js 26.12.0、Next.js 16.4.6 の本番ビルド（`pnpm build && pnpm start`）、OrbStack の Docker Compose の PostgreSQL 18
- Lighthouse 13.6.0、Playwright 1.65.0 の Chromium、モバイルの設定（往復 150ms、1.6Mbps、CPU 4 倍遅い）
- ログインしたテストの人で測った（`scripts/perf.mjs --cookie`）

## 2. LCP・CLS・TBT（NFR-PERF-01〜03）

直したあとの値。`node scripts/perf.mjs`（条件を実際にかけ、3 回の中央の値。[ADR-0058](../adr/0058-measure-speed-with-applied-throttling.md)）。

| 画面 | LCP | CLS | TBT | 判定 |
|---|---|---|---|---|
| `/home` | 1296ms | 0 | 30ms | 予算の内 |
| `/{username}` | 1664ms | 0 | 32ms | 予算の内 |
| `/{username}/status/{id}` | 1349ms | 0 | 38ms | 予算の内 |
| `/search?q=…` | 2032ms | 0 | 38ms | 予算の内 |
| `/notifications` | 1329ms | 0 | 33ms | 予算の内 |

- 測っている途中で、私が誤って `pnpm build` を一度流した（約 80 秒、同じコード）。値が悪い方に揺れた可能性はあるが、どれも予算の内だった

直す前の、Lighthouse の決まりの見積もり（simulated）との比べ:

| 画面 | 見積もりの LCP | 実際に描かれた LCP（条件なし） | JavaScript をふさいだ見積もり | 条件をかけた LCP（直す前） |
|---|---|---|---|---|
| `/{username}` | 3606〜3981ms | 367〜445ms | 2179ms | 1356〜1379ms |
| `/search?q=…` | 3085〜3983ms | 357〜421ms | 1362ms | 2025〜2247ms |
| `/home` | 903〜1514ms | 86〜357ms | 904ms | 1304〜1314ms |

- 見積もりは、描かれた時刻より前に始まった通信を、全部 LCP の前に要るものとして数える。本文は HTML の中のスクリプトで差し込まれ、あとから読む JavaScript を待たないので、流して差し込む画面では大きく外れた
- LCP の要素は、画像の載った投稿では画像、それ以外では投稿の本文だった。画像の配信元をふさいでも、見積もりは変わらなかった（4054ms）

## 3. ホームの最初の描画の問い合わせ（NFR-PERF-04）

レイアウト（`loadViewer`・`loadSidebar`）とページ（`loadHomePage`）を合わせ、本物のセッションの cookie で数えた（`test/home-render-queries.test.ts`）。セッションの読み出しは、本物の描画と同じく 1 回の描画につき 1 回にした。

| 問い合わせ | 直す前 | 直した後 |
|---|---|---|
| セッションの行・ユーザーの行（Better Auth） | 2 | 2 |
| 見た目（theme・accent） | 1 | 0（ユーザーの行と一緒に読む） |
| 未読の数・トレンド・おすすめユーザー | 3 | 3 |
| タイムラインの 1 ページ | 1 | 1 |
| リポストの元・引用された投稿 | 2 | 0（1 ページの問い合わせの中で読む） |
| 画像 | 1 | 0（1 ページの問い合わせの中で読む） |
| 合計（投稿 20 件・40 件） | 10・10 | 6・6 |

- 最初はページの分（4 回）しか数えておらず、独立したレビューで指摘された
- 数えるページの先頭には、リポストと引用を 1 つずつ置いた。2 回目のレビューで、それらが無いページしか数えていない（あれば 8 回になる）と指摘され、どちらも 1 ページの問い合わせの中で読むように直した

## 4. 最初に送る JavaScript（NFR-PERF-05）

ログインした画面の HTML が読むスクリプト（`noModule` を除く）を、1 回ずつ gzip した和。

| 画面 | 直す前 | `env` を分けた後 | 投稿の解析を分けた後 | 直した後 |
|---|---|---|---|---|
| `/home` | 329KB | 299KB | 271KB | 194KB |
| `/{username}` | — | — | — | 196KB |
| `/search?q=…` | — | — | — | 195KB |
| `/notifications` | — | — | — | 174KB |

直す前の内訳（`next analyze`、部品ごとの gzip の和。ファイル全体の gzip より約 3 割大きく出る）:

| 中身 | 量 | 扱い |
|---|---|---|
| Next.js と React | 約 175KB | 残す |
| Base UI と floating-ui | 約 104KB | 使うときに読む |
| core-js と twitter-text | 約 35KB | サーバーで解析し、文字数の数えは入力欄に触れたときに読む |
| zod と t3-env | 約 32KB | `env` を `@/shared/config/index.server` に移した |
| TanStack Query・Virtual | 約 24KB | 残す |
| tailwind-merge | 約 8KB | Base UI と一緒に、使うときに読むようになった |

- Next.js 16.4.6 の `next build` は、画面ごとの量を出さない。量は `e2e/performance.spec.ts` で確かめる（[ADR-0059](../adr/0059-load-popups-and-parsers-on-first-use.md)）

## 5. 投稿 10 万件での「フォロー中」の問い合わせ（NFR-PERF-06）

マイグレーションした空のデータベースに入れて、アプリが送る問い合わせをそのまま `EXPLAIN (ANALYZE, BUFFERS)` した。

| データ | 計画 | 実行の時間（6 回） |
|---|---|---|
| 1,000 人・投稿 10 万件・100 人をフォロー | `posts_pkey` を新しい順に読み、180 行を読み飛ばす | 0.125〜0.236ms |
| 同じデータで 1 人だけをフォロー（その人の投稿 100 件） | 同じ。20,943 行を読み飛ばす | 2.25〜2.39ms |

- どちらも索引を使い、posts を全部読む Seq Scan は無かった
- 同じ確かめを `get-timeline.test.ts` に置いた（10 万件、1,000 件に 1 件がフォローした人の投稿）。並べ順を索引の無い列に変えると Seq Scan になり、テストが落ちることを確かめた

## 6. 推奨・結論

- 5 つの画面は、全部の予算を満たした。超えていたのは最初に送る JavaScript だけで、開くまで要らない部品とサーバーで済む解析を外して 194KB にした
- 速さの計測は手元で行う。JavaScript の量は揺れないので e2e で毎回確かめる

## 参考リンク

- [Lighthouse: Throttling](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)
- [Next.js: next analyze（Turbopack）](https://nextjs.org/docs/app/api-reference/cli/next)
- [web.dev: Largest Contentful Paint](https://web.dev/articles/lcp)
