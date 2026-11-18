---
type: ADR
title: "ADR-0004: Next.js 16.4 の App Router で、UI とサーバーの処理を 1 つのアプリにまとめる"
description: "Next.js 16.4（App Router・Cache Components・Turbopack）の 1 つのアプリに画面とサーバーの処理を全て置き、別の API サーバーを持たない。"
tags: [architecture, nextjs]
status: stable
---

# ADR-0004: Next.js 16.4 の App Router で、UI とサーバーの処理を 1 つのアプリにまとめる

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: ユーザー（最新の Next.js・オールインワン）／エージェント（設定の細目）
- 関連: [Next.js と周辺ツールチェーンの現状](../research/nextjs.md)、ADR-0010、ADR-0012

## 背景

ユーザーは「2026 年 11 月の時点で最新の Next.js のオールインワンアプリにする」と指示した。

2026-11-18 に npm レジストリで確認した `next` の最新の安定版は 16.4.6（2026-11-09 公開）。16.4 から、新しいアプリには Cache Components が公式に勧められ、`create-next-app` の既定で有効になった。Next.js 17 では既定になると公式に書かれている。16.0 で Turbopack が dev と build の既定になり、`middleware.ts` は非推奨になって `proxy.ts` に替わった。

## 決定

- **Next.js 16.4 系（最新のパッチ）の App Router を使い、画面・サーバーの処理・API を 1 つのアプリに置く。** 別の API サーバー、別のフロントエンドは作らない
- React は 19.3 系。Pages Router は使わない
- `next.config.ts` で `cacheComponents: true`・`partialPrefetching: true`・`typedRoutes: true` を有効にする
- ビルドは Turbopack（既定）。webpack は使わない
- `proxy.ts` は「ログインしていなければログインへ送る」粗い門だけにする。認可は各 Server Action とデータアクセス層の中で行う（ADR-0010）
- `middleware.ts`、`next lint`、同期の `params` / `cookies()`、`revalidateTag` の引数 1 つの形など、16 で削除・非推奨になったものは使わない
- React Compiler（`reactCompiler`）は有効にしない。既定が無効で、ビルドが遅くなる。必要になったら新しい ADR で決める
- Next.js は月ごとにセキュリティのリリースがある。パッチは出たら上げる

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| Next.js 16.4 の 1 つのアプリ（採用） | 型・検証・認可を 1 か所に書ける。配備するものが 1 つ。ユーザーの指示どおり | サーバーの処理が Next.js の実行環境に結びつく |
| Next.js と別の API サーバー（Hono・NestJS など） | API を他のクライアントからも使える | 配備が 2 つになり、型と認可を 2 か所に持つ。オールインワンの指示に反する |
| Next.js 15 系 | 情報が多い | 最新ではない。非同期の Request API や Cache Components で、後から直すことになる |
| Cache Components を無効にする | 従来のキャッシュの考え方のまま書ける | 17 で既定になるので、後で全ページを見直すことになる |
| Remix / React Router・TanStack Start | サーバーの処理の書き方が単純 | Next.js という指示に反する |

## 結果

- 画面からデータベースまでを TypeScript の 1 つのプロジェクトで書ける
- Cache Components では、リクエストごとに変わるデータを読む部分を `<Suspense>` で包む必要がある。包み忘れるとビルドでエラーになる
- 並列ルートの全てのスロットに `default.tsx` が要る（無いとビルドが失敗する）
- スマートフォンのアプリなど別のクライアントが必要になったら、Route Handler を足すか、API を切り出す ADR を書く
