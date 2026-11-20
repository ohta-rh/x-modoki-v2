---
type: ADR
title: "ADR-0022: コードは Feature-Sliced Design で分け、Next.js の `app/` はルートに置いてルーティングだけを持たせる"
description: "`src/` を Feature-Sliced Design の 6 つの層（`_app`・`_pages`・`widgets`・`features`・`entities`・`shared`）で分け、Next.js の `app/` はリポジトリのルートに置いてルーティングだけを持たせ、Steiger と ESLint で守る。"
tags: [architecture, structure, fsd]
status: stable
---

# ADR-0022: コードは Feature-Sliced Design で分け、Next.js の `app/` はルートに置いてルーティングだけを持たせる

- ステータス: 採用（守らせ方の節を ADR-0030 で置き換え）
- 日付: 2026-11-18
- 決定者: ユーザー（FSD を使う）／エージェント（層の中身と細目）
- 関連: [アプリケーションの構造](../architecture/application-structure.md)、ADR-0004、ADR-0010（置き場所の節をこの ADR で置き換え）、ADR-0021（外すファイルのパスをこの ADR で置き換え）

## 背景

ユーザーは 2026-11-18 に「Next.js は FSD（Feature-Sliced Design）でやる」と指示した。ADR-0010 は、機能ごとの `src/features/<feature>/` に `data.ts`・`actions.ts`・`components/` を置く、独自の分け方を決めていた。

2026-11-18 に公式の情報で確認した事実:

- FSD の層は、上から App・Pages・Widgets・Features・Entities・Shared。Processes は廃止された。あるスライスのファイルが読めるのは、厳密に下の層のスライスだけ
- 各スライスは公開 API（`index.ts`）を持ち、外からはそこだけを読む。Entities の間の参照は `@x` の書き方だけが許される
- FSD の Next.js の案内は、Next.js の `app/` をリポジトリのルートに置き、`src/` には FSD のコードだけを置くことを勧める。FSD の `app` と `pages` の層は `_app` と `_pages` に名前を変える。データベースの問い合わせは `shared` の `db` セグメント、Route Handler は `_app` の `api-routes` セグメント、サーバーだけの公開 API は `index.server.ts` に書く。Server Action の置き場所は書かれていない
- Next.js は、ルートに `app` があると `src/app` を見ない
- Steiger（FSD のリンター）は 0.10.0、`@feature-sliced/steiger-plugin` は 0.8.2。Node.js 22.18 以上が要る。土台の `@feature-sliced/filesystem` は、層のフォルダ名の先頭のアンダースコアを認識する（パッケージの README で確認）。Steiger は beta

Vitest は非同期の Server Component を測れない（ADR-0021）。

## 決定

### 層

- **`src/` は FSD の 6 つの層で分ける。** それ以外のフォルダを `src/` の直下に作らない

| 層 | 置くもの | 例 |
|---|---|---|
| `src/_app/` | アプリ全体の初期化。Provider、全体のスタイル、Route Handler の実装（`api-routes`） | `providers/`、`styles/`、`api-routes/` |
| `src/_pages/` | 1 つの画面の組み立て。同期のコンポーネントと、その画面のデータを集める関数 | `home`、`profile`、`post-detail` |
| `src/widgets/` | 複数の機能と実体を組んだ、独立した大きな部品 | `app-shell`、`timeline-feed`、`post-thread` |
| `src/features/` | 利用者の 1 つの操作。Server Action と、その操作の UI | `post-compose`、`post-like`、`user-follow` |
| `src/entities/` | 業務の実体。読み取りの問い合わせ、DTO の型、その実体の表示 | `user`、`post`、`media`、`notification` |
| `src/shared/` | 業務を知らない土台 | `ui`、`lib`、`config`、`db`、`auth`、`storage`、`api` |

- **Next.js の `app/` と `proxy.ts` は、リポジトリのルートに置く。** `app/` はルーティングだけを持つ
  - `app/**/page.tsx`・`layout.tsx`・`default.tsx`: 引数を読み、`_pages` の関数でデータを集め、`_pages` の同期のコンポーネントへ渡す。`<Suspense>` で包む。それ以外をしない
  - `app/api/**/route.ts`: `src/_app/api-routes` の関数を、そのまま書き出すだけ
- **非同期の Server Component は、ルートの `app/` の中だけに書く。** `src/` の中のコンポーネントは全部、同期にする

### セグメント

- スライスの中は、目的で分ける: `ui`（表示）、`api`（サーバーとのやり取り）、`model`（型・Zod のスキーマ・状態）、`lib`（そのスライスの中の補助）、`config`
- **データベースを読む・書くコードは、`api` セグメントだけに書く。** 読み取りは `entities/*/api/`、変更は `features/*/api/`。先頭に `import 'server-only'` を置き、認証・認可・DTO への変換を行う（ADR-0010 のデータアクセス層）
- Drizzle のクライアント（`getDb()`）とスキーマは `src/shared/db/`。問い合わせそのものは `shared` に書かず、スライスの `api` に書く
- Server Action は `features/*/api/actions.ts`（`'use server'`）
- セッションを読む関数は `src/shared/auth/`

### 公開 API

- 各スライスは `index.ts` を持ち、外からはそこだけを読む。サーバーだけで読めるもの（`api` の問い合わせ）は `index.server.ts` から出す
- `shared` は、セグメントごと・部品ごとに `index.ts` を持つ。`shared` 全体をまとめた `index.ts` は作らない
- Entities の間の参照は `entities/<A>/@x/<B>.ts` だけ。ほかの層では `@x` を使わない
- 読むときの別名は `@/` を `src/` にする（例: `@/entities/post`、`@/entities/post/index.server`）

### 守らせ方

- **Steiger（`fsd` の推奨の設定）と ESLint を `pnpm lint` に入れ、CI で落とす**（ADR-0020）
- ESLint の `no-restricted-imports` で、次を禁じる
  - `api` セグメントと `src/shared/db`・`src/shared/auth` 以外から、`@/shared/db` を読むこと
  - `'use client'` のファイルから、`index.server` を読むこと
  - ルートの `app/` から、`_pages` と `_app` 以外の層を読むこと
- カバレッジから外すファイルは、`app/**/page.tsx`・`layout.tsx`・`default.tsx`、`src/shared/ui/kit/**`（shadcn/ui から取り込んだコード）、`src/shared/db/schema/**`、型だけのファイル（ADR-0021 の一覧のパスを置き換える）。測る対象は `src/**`・`app/**/route.ts`・`proxy.ts`

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| FSD。`app/` はルート、問い合わせはスライスの `api`（採用） | 層の向きが 1 つで、リンターで守れる。ユーザーの指示どおり。認可が業務のスライスにある | 層とスライスの数が多い。小さい変更でも複数の場所に触る |
| FSD の案内どおり、問い合わせを全部 `shared/db` に置く | 案内のとおり | 認可と DTO という業務の判断が、業務を知らないはずの `shared` に入る |
| FSD の案内どおり、`app/**/page.tsx` は `_pages` の書き出しだけにする | `app/` が最も薄い | 非同期の Server Component が `src/_pages` に入り、カバレッジ 100% から外すファイルが `src/` の中に散る |
| 機能ごとのフォルダ（ADR-0010 の形） | フォルダが少ない | 機能の間の参照の向きを決める規則が無く、リンターで守れない |
| 層の名前を変えず `src/app`・`src/pages` にする | 名前が FSD の標準のまま | Next.js の予約のフォルダ名と同じで、まぎらわしい。今の案内に反する |
| `eslint-plugin-boundaries` だけで守る | ESLint の中で完結する | FSD の決まり（公開 API、セグメントの名前）を自分で書くことになる |

## 結果

- どのファイルがどこを読んでよいかが、層の順で決まる。違反は lint で落ちる
- ADR-0010 の「データアクセス層」「変更は Server Action」「続きは Route Handler」は変わらない。置き場所だけが、`features/*/data.ts` から、`entities/*/api` と `features/*/api` に変わる
- 1 つの機能を足すと、`entities`・`features`・`widgets`・`_pages`・`app` に触ることがある。PBI には、触るスライスを書く
- Steiger は beta。動かない・誤って落とす決まりがあれば、その決まりだけを理由つきで止め、`eslint-plugin-boundaries` で補う ADR を書く
- `proxy.ts` をルートに置く形が Next.js 16.4 で動くことを、最初の骨組みの PBI で確かめる（Next.js の文書は、`src` を使うときは `src` の中に置くと書いている。`app/` がルートにある場合の記載は無い）
