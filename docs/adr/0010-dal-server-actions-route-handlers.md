---
type: ADR
title: "ADR-0010: 読み書きはデータアクセス層に集め、変更は Server Action、続きの読み込みは Route Handler で行う"
description: "データベースへの読み書きと認可は `server-only` のデータアクセス層だけに書き、変更は Server Action、無限スクロールの続きは Route Handler と TanStack Query で行う。"
tags: [architecture, security, data-fetching]
status: stable
---

# ADR-0010: 読み書きはデータアクセス層に集め、変更は Server Action、続きの読み込みは Route Handler で行う

- ステータス: 採用（ファイルの置き場所を ADR-0022 で、誰が見ても同じ読み取りのキャッシュを ADR-0048 で置き換え）
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断）
- 関連: [Next.js と周辺ツールチェーンの現状](../research/nextjs.md)、[アプリケーションの構造](../architecture/application-structure.md)、ADR-0004

## 背景

Next.js の公式のデータの安全性の案内（2026-10-06 更新）は、新しいプロジェクトにデータアクセス層を勧め、取り方を混ぜずに 1 つに決めるよう求めている。Server Action は URL を知らなくても直接 POST で呼べるので、ページや `proxy.ts` での確認は Server Action には及ばない。

Server Action はクライアントから 1 件ずつ順に送られ、公式はデータの取得に使わないよう書いている。タイムラインは下へ行くと続きを読み込み、新しい投稿があるかを定期的に確かめる。Cache Components を有効にすると、TanStack Query の `dehydrate()` は現在の時刻を読むため、そのままではプリレンダーでエラーになる。

## 決定

- **データベースを読む・書くコードは、データアクセス層（`src/features/*/data.ts`）だけに書く。** 先頭に `import 'server-only'` を置く
- データアクセス層の関数は、(1) 今のユーザーを得る、(2) そのユーザーがしてよいかを確かめる、(3) 画面に要る最小の形（DTO）にして返す。データベースの行をそのまま返さない
- ページ・レイアウト・コンポーネント・Server Action・Route Handler から、Drizzle と `process.env` を直接使わない
- **変更は Server Action**（`src/features/*/actions.ts`）。中身は、Zod での入力の検証と、データアクセス層の呼び出しだけにする。認証と認可は毎回データアクセス層で行う
- **最初の画面は Server Component がデータアクセス層を呼んで描く。** リクエストごとに変わる部分は `<Suspense>` で包む
- **無限スクロールの続きと、定期的な確認は、Route Handler（`GET /api/…`）を TanStack Query から呼ぶ。** 最初のページは Server Component が取り、`initialData` としてクライアントのコンポーネントへ渡す（`dehydrate()` は使わない）
- 楽観的な更新は、状態の持ち主で分ける

| 状態の持ち主 | 例 | やり方 |
|---|---|---|
| TanStack Query のキャッシュ | タイムラインの中の投稿のいいね・リポスト・ブックマーク | `useMutation` から Server Action を呼ぶ。投稿の ID で、キャッシュにある全ての一覧の中のその投稿を書き換える。失敗したら戻す |
| Server Component が描いた部分 | プロフィールのフォローのボタン、投稿の詳細 | `useOptimistic` と `startTransition` で Server Action を呼び、`updateTag()` か `refresh()` で描き直す |

- 誰が見ても同じ読み取り（トレンド、おすすめのユーザー）は `'use cache'` と `cacheLife` と `cacheTag` で持つ。ユーザーごとに違う読み取りはキャッシュしない
- `proxy.ts` は、ログインしていない人をログインへ送るだけにする（ADR-0004）
- 回数の制限は、PostgreSQL の表への UPSERT で数える。投稿・フォロー・画像の署名に付ける

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| データアクセス層と、Server Action と Route Handler の使い分け（採用） | 認可が 1 か所。公式の案内どおり。続きの読み込みは GET でキャッシュと再試行が効く | 層が 1 つ増える。楽観的な更新のやり方が 2 つある |
| コンポーネントから直接 Drizzle を使う | 書く量が少ない | 認可を忘れる場所ができる。行がそのままクライアントに渡る恐れがある |
| 続きの読み込みも Server Action | Route Handler を書かなくてよい | 順に送られるので遅い。公式が勧めていない |
| 全部を Route Handler と TanStack Query（SPA の形） | やり方が 1 つ | Server Component の最初の描画とストリーミングを使わない。型を両側に書く |
| tRPC などを足す | 型が端から端まで通る | 1 つのアプリの中では Server Action で足りる。依存が増える |
| `dehydrate()` と `HydrationBoundary` | TanStack Query の標準の形 | Cache Components で時刻を読んでエラーになり、回避の仕組みが要る |

## 結果

- 「この操作を誰がしてよいか」は、データアクセス層を読めば分かる
- Route Handler と Server Action の入力は、同じ Zod のスキーマ（`src/features/*/schema.ts`）で確かめる
- 新しい機能を足す人は、状態の持ち主がどちらかを先に決めてから、楽観的な更新を書く
- ESLint の `no-restricted-imports` で、`src/app` と `components` から `src/server/db` を読むことを禁じる
