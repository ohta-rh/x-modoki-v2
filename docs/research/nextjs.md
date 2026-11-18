---
type: Research
title: "Next.js と周辺ツールチェーンの現状"
description: "Next.js 16.4 と React・TypeScript・lint・テスト・UI の道具の、2026-11-18 の時点の版と状態を調べた結果。"
tags: [nextjs, toolchain, versions]
status: stable
---

# Next.js と周辺ツールチェーンの現状

## 調査日: 2026-11-18

調査方法: nextjs.org のブログ/ドキュメント(WebFetch)、react.dev、各ツール公式ブログ、`npm view`(npm registry)で一次確認。確認できなかった点は「未検証事項」に分離。

---

## 1. Next.js 最新安定版と主要リリース履歴

### 1.1 最新安定版 (npm `latest` dist-tag)

| 項目 | 値 | 根拠 |
|---|---|---|
| 最新安定版 | **16.4.6** (2026-11-09 公開) | `npm view next version` / time |
| 最新マイナー | **16.4.0** (2026-10-06 公開) | blog: Next.js 16.4 |
| 最低 Node.js | **>=20.9.0** (`engines`) | `npm view next engines`、docs/installation |
| React | `peerDependencies.react = ^18.2.0 \|\| 19.0.0-rc-... \|\| ^19.0.0`。App Router は Next 内蔵の React canary を使用(16.4 は **React 19.3** 相当の機能を同梱)。package.json に `react`/`react-dom` 宣言は必要。npm 最新は react **19.3.1** (2026-10-14) | docs/installation, blog 16.4, npm |
| 最低 TypeScript | 5.1.0 (docs/installation)。ただし TS 7 も `next build` で利用可(後述) | docs |
| 対応ブラウザ | Chrome/Edge/Firefox 111+, Safari 16.4+ | docs |
| 次期 | `canary` = 16.5.0-canary.53。**Next.js 17 で Cache Components がデフォルトになる**と公式に明言 | npm / blog 16.4 |

注意: Node 20 は Node.js 公式の previous-releases ページで **EOL** 表記。Next は `>=20.9` を許容するが、greenfield は **Node 24 LTS** 推奨(根拠は 5 章の推奨表と未検証事項参照)。

### 1.2 Next.js 15 以降の主要リリース(npm の公開日 / 公式ブログ)

| 版 | 日付 | 見出しの変更 |
|---|---|---|
| 15.0 | 2024-10-21 | React 19 対応、Turbopack dev 安定化、非同期 Request API 導入、`fetch`/GET Route Handler の既定キャッシュ廃止 |
| 15.1 | 2024-12-10 | React 19 安定サポート、`after()` 安定化(docs の Version History: v15.1.0)、エラーデバッグ改善 |
| 15.2 | 2025-02-26 | デバッグ/メタデータ/Turbopack 改善 |
| 15.3 | 2025-04-09 | Turbopack build(alpha)、`instrumentation-client` 等 |
| 15.4 | 2025-05-30(blog 7/14) | 安定性・Turbopack 互換 |
| 15.5 | 2025-08-18 | Turbopack build(beta)、Node.js middleware 安定、`next lint` 非推奨化、v16 向け deprecation 警告 |
| **16.0** | **2025-10-21** | Cache Components(`cacheComponents`、`use cache`)、Turbopack 安定・既定、`proxy.ts`、React Compiler 安定サポート、React 19.2、`updateTag`/`refresh`、`revalidateTag` 2引数化、`next lint` / AMP 削除、Node 20.9+ |
| 16.1 | 2025-12-18 | Turbopack FS キャッシュ(dev)安定・既定、`next experimental-analyze`、`next upgrade` コマンド |
| 16.2 | 2026-03-18 | Adapters API 安定、dev 起動約 87% 高速化、RSC ペイロード deserialize 高速化(25〜60% 高速レンダリング)、`<Link transitionTypes>`、`unstable_catchError`(実験) |
| 16.3 | 2026-08-03 | **Instant Navigations**(`partialPrefetching`)、dev メモリ最大 90% 減(eviction)、build の FS キャッシュ既定、TS 7 で型チェック可、`catchError`、`next/root-params`、`import.meta.glob`、Rust 製 React Compiler(実験) |
| **16.4** | **2026-10-06** | **全新規アプリで Cache Components 推奨・`create-next-app` 既定有効**、`ensureStatic`、`navigation()`/`prefetch()` API、React 19.3、Turbopack ディスクキャッシュ 20–25% 縮小、`next upgrade --agent` |
| 16.4.6 | 2026-11-09 | パッチ(月次セキュリティリリース運用: 2026-07 以降は定期リリース) |

セキュリティ運用: 2026-07 から Next.js は「月次セキュリティリリース」プロセスに移行(blog: next-security-release-program)。2026-09-22 / 10-14 / 11-03 にも修正リリースがあったため、**常に最新パッチへ追従**すること。2025-12 には RSC プロトコルの重大脆弱性(CVE-2025-66478)もあった。

---

## 2. App Router 推奨アーキテクチャと各機能の状態

| 機能 | 状態 (16.4.6) | 正確な API / 設定キー | 備考 |
|---|---|---|---|
| Server Components | 安定・既定 | (既定) | Client は `'use client'`。Client Component の async 化は lint で禁止 |
| Server Actions / Server Functions | 安定 | `'use server'` | **クライアントからは1件ずつ逐次ディスパッチ**(`Promise.all` で並列化不可)。データ取得には使わず、変異専用。1MB ボディ上限 (`serverActions.bodySizeLimit` は `experimental.serverActions` 配下) |
| Route Handlers | 安定 | `app/**/route.ts` | Cache Components 有効時、`GET` はページと同じ prerender モデル。外部クライアント向けAPI・非変異リクエスト向け |
| **Cache Components** | **安定(16.4 で全アプリに推奨、17 で既定化予定)** | `cacheComponents: true` + `partialPrefetching: true`(両方を明示。`partialPrefetching` 未設定は警告) | 旧 `experimental.dynamicIO` は `cacheComponents` に改名済み。`create-next-app` の推奨設定で有効 |
| `use cache` | 安定 | `'use cache'`(`'use cache: private'`, `'use cache: remote'` 派生あり) | 各 `use cache` に `cacheLife` を併記推奨。引数/クロージャ値がキャッシュキーになる |
| `cacheLife` / `cacheTag` | 安定 | `import { cacheLife, cacheTag } from 'next/cache'` | プロファイル: `'minutes'`,`'hours'`,`'days'`,`'max'` 等 |
| `updateTag` | 安定(**Server Actions 専用**) | `updateTag(tag)` | read-your-writes。同一レスポンスで再レンダリング込み |
| `revalidateTag` | 安定 | `revalidateTag(tag, 'max')`(**第2引数必須**、単引数は deprecated) | SWR 挙動。アクション応答に即時再描画を含めない |
| `refresh` | 安定(Server Actions 専用) | `refresh()` from `next/cache` | 非キャッシュデータのみ更新 |
| `revalidatePath` | 安定 | `revalidatePath('/x')` | 即時無効化+再描画 |
| Partial Prerendering | **Cache Components に統合**(旧 `experimental.ppr` / `experimental_ppr` は 16.0 で削除) | 設定不要(`cacheComponents` で既定動作) | 静的シェル+Suspense でストリーム |
| Partial Prefetching / Instant Navigations | 16.3 で導入、Cache Components の一部として位置付け | `partialPrefetching: true`、`<Link prefetch={true}>`、DevTools Instant Insights、Playwright `instant()`(`@next/playwright`) | 17 で既定化しオプション削除予定 |
| `ensureStatic` / `navigation()` / `prefetch()` | 16.4 新規 | `export const ensureStatic = 'navigation'\|'prefetch'\|'shell'`、`import { navigation, prefetch } from 'next/cache'` | 静的保証/prefetch 時の遅延 |
| `proxy.ts` | 安定。`middleware.ts` は **deprecated**(Edge 用途のみ残存) | `proxy.ts`、`export function proxy(request)`(または default export)、`config.matcher`。**Node.js ランタイム固定**(`runtime` 設定不可)。移行: `npx @next/codemod@canary middleware-to-proxy .` | 公式は「最後の手段」と位置付け。Server Function は POST として当該ルートに届くため matcher 除外で proxy 素通りになる → **認可は各 Action 内で必須** |
| Turbopack | **dev/build とも安定・既定** | `next dev` / `next build`(webpack は `--webpack`)。設定は最上位 `turbopack`(`experimental.turbopack` から移動) | FS キャッシュ: dev(16.1〜)/build(16.3〜)既定有効。`experimental.turbopackGc` 等は実験 |
| React Compiler | **安定(16.0〜)だが既定オフ**。`create-next-app` 既定も "No React Compiler" | `reactCompiler: true`(最上位)、`babel-plugin-react-compiler`(npm 1.0.0)を devDependency に。Rust 版は `experimental.turbopackRustReactCompiler`(実験) | `compilationMode: 'annotation'` + `'use memo'` で opt-in も可 |
| Typed routes | **安定**(最上位) | `typedRoutes: true`(`experimental.typedRoutes` ではない)。`PageProps<'/x/[id]'>` / `LayoutProps` / `RouteContext` グローバル型ヘルパー(`next typegen`) | 非リテラル href は `as Route` |
| `next/form` | 安定 | `import Form from 'next/form'`、`<Form action="/search">`(GET+クライアント遷移+prefetch)、`action={fn}` で Server Action | 検索バーに最適。`method` 等は不可 |
| View Transitions | **React 19.3 で `<ViewTransition>` / `addTransitionType` が安定** | `import { ViewTransition } from 'react'`、`<Link transitionTypes={['slide']}>`(16.2〜) | 公式ガイド: docs/app/guides/view-transitions |
| Parallel Routes / Intercepting Routes | **引き続きサポート**。変更点: 全スロットに `default.js` 必須(16.0〜、無いとビルド失敗) | `@slot`、`default.tsx`、`(.)login` 等 | 公式例は「ソーシャルのフィード」「deep-link 可能なモーダル」。スロットは全て同じレンダリング種別(static/dynamic 混在不可) |
| `after()` | **安定(15.1〜)** | `import { after } from 'next/server'` | Server Components / Server Functions / Route Handlers / Proxy で使用可。Server Component 内では `cookies()`/`headers()` を callback 内で呼べない(事前に読む) |
| Instrumentation | 安定 | `instrumentation.ts` + `export function register()`(+ `onRequestError`、`instrumentation-client.ts` は 15.3 導入) | 起動時1回。runtime は `NEXT_RUNTIME` で分岐 |
| `catchError` | 16.3 で安定化(16.2 は `unstable_catchError`) | `import { catchError } from 'next/error'`、`retry()` | `notFound`/`redirect` を妨げない |
| Root params | 16.3 新規 | `import { lang } from 'next/root-params'` | Server Components のみ(Route Handler/Action は将来) |
| Adapters API | 安定(16.2) | `adapterPath` | デプロイ基盤向け |
| オフライン再試行 | **実験** | `experimental.useOffline` | 本番非推奨 |
| `authInterrupts` (`unauthorized()`/`forbidden()`) | **実験** | `experimental.authInterrupts` | |
| `experimental.taint` | **実験** | `experimental.taint: true` | 4 章参照 |

### 推奨アーキテクチャ(要約)

1. `cacheComponents: true` + `partialPrefetching: true`(`create-next-app` の推奨設定で自動)。
2. 読み取り: Server Component から DAL(`server-only`)経由。共有可能な読み取りは `'use cache'` + `cacheLife` + `cacheTag`。ユーザー固有/リクエスト時データは `<Suspense>` で包む。
3. 変異: `'use server'` の薄い Action → DAL に委譲(認証・認可・検証は DAL/Action 内)→ `updateTag()`(自分の変更を即反映)。
4. Route Handler はメディア署名URL発行・Webhook・外部/クライアントフェッチ(無限スクロール用 JSON)に限定。
5. `proxy.ts` は粗いゲート(未ログイン→リダイレクト等)のみ。真の認可は DAL。

---

## 3. Greenfield が把握すべき破壊的変更・非推奨(15 → 16.x)

| 領域 | 変更 | 対応 |
|---|---|---|
| 非同期 Request API | `params`/`searchParams`/`cookies()`/`headers()`/`draftMode()` は **同期アクセス完全削除**(16.0) | 必ず `await`。`PageProps<'/x'>` ヘルパー利用 |
| `next lint` | **削除**。`next build` もリント実行しない。`next.config` の `eslint` オプション不要 | `eslint` CLI(`"lint": "eslint"`)または `biome check`。`create-next-app` の linter 選択肢は ESLint / Biome / None |
| AMP | 完全削除(`useAmp`, `amp: true`) | 該当なし |
| `middleware.ts` | deprecated → `proxy.ts` | 3 章/2 章参照 |
| `revalidateTag(tag)` 単引数 | deprecated | `revalidateTag(tag, 'max')` か Action 内 `updateTag(tag)` |
| `experimental.dynamicIO` / `experimental.ppr` / `experimental_ppr` | 削除 | `cacheComponents` |
| `experimental.turbopack` | 最上位 `turbopack` へ移動 | |
| `serverRuntimeConfig`/`publicRuntimeConfig` | 削除 | 環境変数 |
| `devIndicators` の一部 | `appIsrStatus`,`buildActivity`,`buildActivityPosition` 削除 | |
| 画像 `images.minimumCacheTTL` | 既定 60s → **4時間** | |
| 画像 `images.imageSizes` | 既定から `16` 削除 | |
| 画像 `images.qualities` | 既定 `[75]` のみ(`quality` は最近傍に丸め) | 複数品質が要る場合は明示 |
| 画像 `images.dangerouslyAllowLocalIP` | ローカル IP 最適化は既定でブロック | |
| 画像 `images.maximumRedirects` | 既定 3 | |
| 画像 `images.domains` | deprecated | `images.remotePatterns` |
| `next/legacy/image` | deprecated | `next/image` |
| ローカル画像 src のクエリ文字列 | `images.localPatterns` 必須 | |
| 並列ルート | 全スロットに `default.js` 必須 | `return null` か `notFound()` |
| `scroll-behavior: smooth` | 自動付与を廃止 | `data-scroll-behavior="smooth"` を `<html>` に |
| `unstable_rootParams()` | 削除 → 16.3 で `next/root-params` | |
| Sass | `sass-loader` 16(モダン API) | |
| ビルド出力 | `next dev`/`next build` は別ディレクトリ(並行実行可)。lockfile で多重起動防止 | |
| `@next/eslint-plugin-next` | 既定が Flat Config。ESLint 9/10 対応(`eslint-config-next@16.4.0` 以降 ESLint 10 の React バージョン検出に対応) | |
| ブラウザ要件 | Chrome/Edge/Firefox 111+, Safari 16.4+ | |
| Node | 20.9+ | |
| `eslint-config-next` が引く `typescript-eslint` | **TypeScript 7 と非互換**(6 章参照) | |

16.x 内の追加注意: dev/build に FS キャッシュが既定で有効、`useTypeScriptCli`(実験)により `next build` はプロジェクトローカルの `tsc` CLI を既定実行(Next 固有のコードフレームは出ない)。

---

## 4. データアクセスのセキュリティ(公式ガイダンス: docs/app/guides/data-security, 2026-10-06 更新)

| 項目 | 公式推奨 |
|---|---|
| データ取得方針 | 3 択: 外部 HTTP API(既存大規模向け)/ **Data Access Layer(新規プロジェクト推奨)**/ コンポーネント内直接(プロトタイプ向け)。**混在させず1つを選ぶ** |
| DAL の要件 | サーバーのみで実行、認可チェックを実施、最小の **DTO** を返す。`process.env` の読み取りは DAL のみ |
| `server-only` | DAL/秘密を扱うモジュールに `import 'server-only'`。Client から import するとビルドエラー |
| 認証ヘルパー | `cache()`(React)で `getCurrentUser` を同一リクエスト内メモ化し、props でのバケツリレーを避ける |
| Server Actions | **直接 POST で到達可能**。Action 内で毎回 **認証+認可(所有者チェック=IDOR 対策)+入力検証(zod 等)**。ページ側の認可チェックは Action に及ばない |
| 組み込み防御 | 暗号化・非決定的な Action ID(最大14日でローテーション)、未使用 Action の DCE、Origin/Host 比較による CSRF チェック、クロージャ変数の暗号化、1MB ボディ上限 |
| 戻り値 | 生の DB レコードを返さず、UI に必要な最小形に整形 |
| マルチインスタンス | `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`(base64、16/24/32 バイト)を固定。`serverActions.allowedOrigins`(`experimental.serverActions` 配下)でプロキシ構成の Origin 許可 |
| レート制限 | 高コスト操作(投稿・メール等)に推奨。Backend for Frontend ガイドに例 |
| taint | `experimental_taintObjectReference` / `experimental_taintUniqueValue` は **実験扱い**。`experimental.taint: true` が必要。「追加の保護層であり、DAL でのフィルタが主」と明記 |
| レンダリング中の副作用禁止 | クッキー設定・キャッシュ無効化はレンダー中不可。Action で行う |
| 監査観点 | DAL 分離、`"use client"` ファイルの props 型、`"use server"` の認可・検証・戻り値、`[param]` の検証、`proxy.ts`/`route.ts` を重点監査 |
| Proxy と認可 | Proxy matcher の変更/Action 移設で保護が外れる恐れ。**Proxy だけに頼らず Action 内で検証** |
| 並列ルート | 全スロットがサーバー実行される。条件分岐で出し分けても各スロット内で認可必須 |

---

## 5. スタイリング/UI ツールチェーン

| パッケージ | 最新安定版 | 公開日 | 状態・備考 |
|---|---|---|---|
| tailwindcss | **4.3.5** | 2026-11-06 (4.3.0 は 2026-05-08) | v4 系(CSS-first)。4.3: スクロールバー、`zoom`/`tab-size` 等。v5 の言及なし(未確認)。2026-09-09「Tailwind Labs が Shopify に参画」の発表あり |
| @tailwindcss/postcss | 4.3.5 | | Next は PostCSS 経由。`create-next-app` 既定に Tailwind 含む |
| shadcn (CLI) | **4.23.0** | 2026-10-27 | CLI v4 は 2026-03。`pnpm dlx shadcn@latest init`(新規は `-t next`) |
| shadcn/ui のプリミティブ | **2026-07 から Base UI が既定**。Radix は「非推奨ではない」、新規コンポーネントは両対応(Base UI のみのものあり)。Radix で初期化: `shadcn init -b radix` | | 移行は任意、スキル `pnpm dlx skills add shadcn/ui` で1コンポーネントずつ可。`asChild` → `render` に変わる |
| @base-ui/react | **1.9.0** | 2026-10-09 (1.0.0 は 2025-12-11) | 安定 1.x |
| radix-ui(統合パッケージ) | 1.8.1 | 2026-10-14 更新 | 2026-02 に "Unified Radix UI Package" |
| React Aria | shadcn が対応 | | 代替選択肢(Base UI / React Aria / Radix の3択、8スタイル) |

ピクセル制御の自作 UI の本流: **Tailwind CSS v4 + shadcn/ui(コード所有型。コピーして改変)+ Base UI(新規既定)** が現在の主流。コンポーネントはリポジトリ内にコピーされるため、見た目の完全制御が可能。完全自作なら Base UI 直接利用 or React Aria も選択肢。Radix は成熟しているが新規は Base UI を既定とするのが shadcn の方針。(「主流」の判断は shadcn 公式の既定変更と Tailwind 既定同梱に基づく推論。利用シェア統計は未検証)

---

## 6. 開発ツールチェーン

| ツール | 最新安定版 | 公開日 | 状態・注意 |
|---|---|---|---|
| TypeScript | **7.0.2** (latest) / 6.0.3 (最新 6.x、2026-04-16) | 7.0 発表 2026-07-08(7.0.2 は 07-08) | **7.0 は Go ネイティブ版・JS コンパイラ API なし**(7.1 で新 API 予定)。`strict` 既定 true、`baseUrl` はハードエラー、`moduleResolution: node` 等削除。**typescript-eslint 8.73.0 の peer は `typescript >=4.8.4 <6.1.0`** のため TS 7 とは npm 上衝突(検索結果ベース、公式表明は未発見)。Next は `next build` で `tsc` CLI を使うため TS 7 でビルド型チェック可(`typescript@^7`、`experimental.useTypeScriptCli`)。IDE プラグイン等は要確認 |
| ESLint | **10.15.0** (latest) / 9.39.5 (maintenance) | 10.0.0: 2026-02-06 | **ESLint 9 は 2026-08-06 に EOL**(検索結果の見出し情報)。ESLint 10 は Node `^20.19.0 \|\| ^22.13.0 \|\| >=24` 必須。`eslint-config-next` は 9/10 両対応(16.4.0〜) |
| eslint-config-next | 16.4.6(next と同版) | | `eslint-config-next/core-web-vitals` + `/typescript`(typescript-eslint 利用)。`eslint.config.mjs` + `defineConfig`/`globalIgnores` |
| eslint-plugin-react-hooks | 7.1.1 | | `eslint-config-next` が `^7.1.0` を内包 |
| Biome | **2.6.8** | 2.6: 2026-10-15 | Next 公式が `create-next-app` で選択肢に採用(リント+フォーマット)。Next/React ドメイン規則の対応範囲は **未検証** |
| Oxlint | **1.94.0** | 2026-11-16 更新 | Next 公式の `create-next-app` 選択肢には含まれず(ESLint/Biome/None のみ)。Next 向けルールの網羅度は未検証 |
| Prettier | 3.10.1 | | ESLint 併用時は `eslint-config-prettier/flat` |
| pnpm | **12.21.0** | 12.0.0: 2026-08-26 | Next.js docs は pnpm コマンドを併記。**global virtual store** と Next の `experimental.turbopackAdditionalRoots` で手動統合可(自動統合は将来)。`engines.node >=18` |
| Vitest | **5.1.0** | 5.0: 2026-09-03、5.1: 2026-11-02 | **要 Node >=22.12 / Vite >=6.4**。破壊的変更: `clearMocks` 既定 true、未 await の `resolves/rejects` は失敗、`Temporal` を fake 等 |
| Vite | 8.3.8 | | `@vitejs/plugin-react` 6.3.0 の peer は `vite ^8` |
| @testing-library/react | 16.3.3 | | `@testing-library/dom` 10.4.2 も別途必要 |
| @testing-library/user-event | 14.6.12 | | |
| jsdom | 31.0.1 | | |
| Playwright (@playwright/test) | **1.65.1** | 2026-11-13 | 要 Node >=20。`@next/playwright`(16.4.6)の `instant()` ヘルパーで「即時ナビゲーション」回帰テスト |
| Cypress / Jest | Next docs が引き続き 4 本柱として掲載 | | Jest/Vitest=ユニット、Playwright/Cypress=E2E |

### Next.js 公式のテスト推奨(docs/app/guides/testing, 2026-02-03 更新)

- 4 ツール(Cypress / Jest / Playwright / Vitest)のセットアップガイドを提供。Vitest は「ユニットテスト」、Playwright は「E2E」。
- **async Server Component の制限**: 「async Server Components は React エコシステムで新しく、一部ツールが完全には対応していない。**async コンポーネントには Unit Testing ではなく E2E を推奨**」。Vitest ガイドも「Vitest は現時点で async Server Components をサポートしない。同期の Server/Client Component はユニットテスト可」と明記。
- Vitest 手動セットアップ: `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`、`vitest.config.mts` で `environment: 'jsdom'`。
- Proxy のユニットテスト: `next/experimental/testing/server`(`unstable_doesMiddlewareMatch` 等、実験)。

---

## 7. クライアント側データパターン(無限スクロール・楽観的更新)

| 項目 | 現状 | 根拠 |
|---|---|---|
| `useOptimistic` | 引き続き中心的。**`useTransition`/`startTransition` 内で `setOptimistic` → Server Action を await** が公式パターン。失敗時は自動で確定値へロールバック | blog: building-app-like-experiences-with-nextjs-16-3 |
| `useActionState` | 繰り返し変異を**順序保持で直列化**する用途(例: provider で `useActionState` + `useOptimistic`)。React 19.3 ではエラーメッセージ文言が "action state" に変わった程度 | 同上 / react.dev 19.3 |
| `use()` | Promise を Client に渡して読む用途。19.3 では条件付き呼び出しの警告追加。新規 `browser()`(react-dom): `use(browser())` でクライアント専用部分を SSR から除外 | react.dev 19.3 |
| Server Action の制約 | クライアントから**逐次ディスパッチ**。取得は Server Component / Route Handler。`updateTag` で同一往復に再描画込み | docs/guides/server-actions |
| TanStack Query | **公式ガイドが現行で存在**(docs/app/guides/client-side-data-fetching/tanstack-query、2026-10-15 更新)。最新 **@tanstack/react-query 5.108.0** (2026-11-17)。SSR: `QueryClientProvider`(サーバーは毎回新規 QueryClient、ブラウザは再利用)、`HydrationBoundary`+pending クエリの dehydrate(5.40+)、`useSuspenseQuery`。Cache Components 下では `dehydrate()` が `Date.now()` を読み **current-time prerender error** になるため、公式が `use cache` でタイムスタンプをキャッシュする自前 `dehydrate` 例を提示 | docs |
| SWR | 公式ガイドに並列掲載(`SWRConfig`/`preload`)。ライブ更新やポーリング向け | docs, blog |
| 無限スクロール | 公式ドキュメントに `useInfiniteQuery` 専用の記載は**確認できず**(未検証)。ただし公式は「Server Components でまず初期データ → クライアントがポーリング/オンデマンド/楽観更新を引き継ぐ」構成を推奨 | blog 16.3 |

### 結論(7 章)

- 楽観的更新(いいね・フォロー・投稿送信): `useOptimistic` + `startTransition` + Server Action + `updateTag`。TanStack Query は必須でない。
- 無限スクロール・カーソルページネーション(タイムライン): Server Component で最初のページを描画し、続きのページは **TanStack Query v5 の `useInfiniteQuery`(Route Handler を `queryFn` から叩く)** が現状も妥当な選択(公式が TanStack Query ガイドを現行維持しているため、推奨が否定された形跡はない)。ただし公式ドキュメントが「無限スクロールには TanStack Query を推奨」と直接述べているわけではない点は未検証。
- 代替: クライアント側 `IntersectionObserver` + Server Action で次ページを取得する方式は、Action が逐次ディスパッチかつ「取得に Action を使うな」と公式が述べているため非推奨。Route Handler(GET)経由が筋。

---

## 8. 推奨・結論

### 8.1 バージョン表(greenfield、2026-11-18 時点)

| パッケージ | 推奨バージョン | 理由 |
|---|---|---|
| Node.js | **24 LTS** (22 LTS も可) | Node 20 は EOL 表記。ESLint 10 は `^20.19 \|\| ^22.13 \|\| >=24`、Vitest 5 は >=22.12 必須。Next は >=20.9 |
| Next.js | **16.4.6**(以降の最新パッチ) | 現行最新。Cache Components を全新規アプリに公式推奨。月次セキュリティ修正に追従 |
| react / react-dom | **19.3.1** | npm 最新。Next 16.4 は 19.3 機能(`ViewTransition` 安定等)を内蔵 canary で提供 |
| @types/react | 19.3.0 | npm 最新 |
| TypeScript | **6.0.3(推奨)** ※7.0.2 は条件付き | typescript-eslint(peer `<6.1.0`)と `eslint-config-next/typescript` を使う限り TS 7 は npm 衝突。TS 7 を使うなら型チェックのみ `tsc` 7、ESLint 側は `@typescript/typescript6` エイリアス(未検証の回避策)。TS 7 は `baseUrl` ハードエラー → `paths` のみで運用(Next 既定 `@/*`) |
| Tailwind CSS | **4.3.5** + `@tailwindcss/postcss` 4.3.5 | v4 系最新、`create-next-app` 既定 |
| shadcn CLI | **4.23.0** | 既定は Base UI。 |
| @base-ui/react | **1.9.0** | shadcn 既定プリミティブ(2026-07〜) |
| ESLint | **10.15.0** + `eslint-config-next` 16.4.6 | ESLint 9 は EOL。`eslint-config-next` は 10 対応済み(peer 警告の可能性あり) |
| Biome(代替) | 2.6.8 | ESLint の代わりに採用するなら `create-next-app` で選択可。ただし TS 7 と typescript-eslint 問題を避けられる利点 |
| pnpm | **12.21.0** | 最新。lockfile で `packageManager` 固定 |
| Vitest | **5.1.0** + `@vitejs/plugin-react` 6.3.0 + Vite 8.3.8 | 同期コンポーネント・ユーティリティ・DAL のユニット用 |
| @testing-library/react | 16.3.3(+ `@testing-library/dom` 10.4.2, `user-event` 14.6.12) | |
| jsdom | 31.0.1 | |
| @playwright/test | **1.65.1** + `@next/playwright` 16.4.6 | async Server Component は E2E で検証。`instant()` で即時ナビ回帰テスト |
| @tanstack/react-query | **5.108.0** | タイムライン無限スクロール(`useInfiniteQuery`/`useSuspenseInfiniteQuery`)用 |
| babel-plugin-react-compiler | 1.0.0(使う場合のみ) | `reactCompiler: true` は既定オフ。ビルド時間増。最初はオフで開始可 |
| server-only | 0.0.1 | DAL の境界 |
| zod | 4.6.7 | Server Action の入力検証 |

### 8.2 `next.config.ts` の推奨出発点

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  // reactCompiler: true, // 任意(既定オフ。babel-plugin-react-compiler が必要)
};
export default nextConfig;
```

### 8.3 設計上の主要判断

1. **`create-next-app` の「Yes, use recommended defaults」**(TypeScript, ESLint, Tailwind, App Router, Cache Components, AGENTS.md)で開始し、必要なら ESLint → Biome を選択。
2. 読み取りは DAL(`server-only` + 認可 + DTO)に集約。変異は薄い `'use server'` → DAL。`proxy.ts` は粗いゲートのみ。
3. タイムライン: 初期ページは Server Component + `'use cache'`(共通部分)/ Suspense(ユーザー固有部分)。続きは Route Handler(GET)+ TanStack Query `useInfiniteQuery`。
4. いいね/フォロー: `useOptimistic` + `startTransition` + Server Action + `updateTag`。
5. 検索: `next/form`(GET、`searchParams`)+ `'use cache'` の検索関数。
6. メディアアップロード: Route Handler で署名付きURLを発行(Server Action の 1MB 上限を回避)。
7. 通知/ロギング: `after()`、`instrumentation.ts`。
8. ナビゲーション演出: React 19.3 の `<ViewTransition>`、`<Link transitionTypes>`。
9. モーダル詳細(投稿詳細のオーバーレイ等): Parallel + Intercepting Routes(公式がフィード/モーダルを想定ユースケースとして掲載)。`default.tsx` を全スロットに必須配置。

---

## 未検証事項

- Node.js 22/24/26 の正確な EOL 日・Active/Maintenance 区分(Node 20 が EOL 表記であることのみ nodejs.org で確認。他は一般知識)。
- Next.js 16.4 が実際に同梱する React 内蔵 canary のビルド識別子(ブログは「React 19.3」とのみ記載)。
- 16.4.0〜16.4.6 各パッチの個別変更点・脆弱性詳細(月次セキュリティリリース記事は未精読)。
- TypeScript 7 と typescript-eslint の公式サポート状況(検索結果の第三者情報と npm の peer 範囲のみ。公式表明・`@typescript/typescript6` 回避策は未確認)。Next の IDE TS プラグインが TS 7 で動くかも未確認。
- Biome / Oxlint の Next.js / React 向けルールの網羅性、および ESLint(`eslint-config-next`)との品質比較。
- 「shadcn + Base UI がピクセル制御 UI の主流」という利用シェア統計(公式既定変更の事実のみ確認)。
- Tailwind v5 の計画有無、Tailwind Labs の Shopify 参画が OSS ライセンス/開発に与える影響。
- TanStack Query の `useInfiniteQuery` を RSC 併用で公式が推奨しているかの直接記述(ガイドに無限スクロール節は確認できず)。
- Vitest 5 の全破壊的変更一覧(ブログ要約のみ)、Playwright 1.65 の変更点。
- shadcn CLI 4.x の `init -b` 以外の全フラグ、`-t next` テンプレートの内容。
- Drizzle/Prisma/認証ライブラリ(npm 上は better-auth 1.7.25、drizzle-orm 0.45.4(1.0 は rc)、prisma 8.0.0-rc)は調査範囲外のため推奨せず。

---

## 参考リンク

- [Next.js blog 一覧](https://nextjs.org/blog)
- [Next.js 16.4](https://nextjs.org/blog/next-16-4)
- [Next.js 16.3](https://nextjs.org/blog/next-16-3)
- [Next.js 16.2](https://nextjs.org/blog/next-16-2)
- [Next.js 16.1](https://nextjs.org/blog/next-16-1)
- [Next.js 16](https://nextjs.org/blog/next-16)
- [Building App-like Experiences with Next.js 16.3](https://nextjs.org/blog/building-app-like-experiences-with-nextjs-16-3)
- [Docs: Installation](https://nextjs.org/docs/app/getting-started/installation)
- [Docs: Caching (Cache Components)](https://nextjs.org/docs/app/getting-started/caching)
- [Docs: Data Security](https://nextjs.org/docs/app/guides/data-security)
- [Docs: Server Actions and Mutations](https://nextjs.org/docs/app/guides/server-actions)
- [Docs: proxy.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Docs: after](https://nextjs.org/docs/app/api-reference/functions/after)
- [Docs: Parallel Routes](https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes)
- [Docs: Form component](https://nextjs.org/docs/app/api-reference/components/form)
- [Docs: Instrumentation](https://nextjs.org/docs/app/guides/instrumentation)
- [Docs: reactCompiler](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler)
- [Docs: typedRoutes](https://nextjs.org/docs/app/api-reference/config/next-config-js/typedRoutes)
- [Docs: TypeScript(TS 7 の節含む)](https://nextjs.org/docs/app/api-reference/config/typescript)
- [Docs: useTypeScriptCli](https://nextjs.org/docs/app/api-reference/config/next-config-js/useTypeScriptCli)
- [Docs: ESLint Plugin](https://nextjs.org/docs/app/api-reference/config/eslint)
- [Docs: Testing](https://nextjs.org/docs/app/guides/testing)
- [Docs: Vitest セットアップ](https://nextjs.org/docs/app/guides/testing/vitest)
- [Docs: TanStack Query](https://nextjs.org/docs/app/guides/client-side-data-fetching/tanstack-query)
- [React 19.3 リリース記事](https://react.dev/blog/2026/09/09/react-19-3)
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [typescript-eslint: TS 7 関連 issue](https://github.com/typescript-eslint/typescript-eslint/issues/12518)
- [Vitest 5 リリース記事](https://vitest.dev/blog/vitest-5)
- [Vitest blog 一覧](https://vitest.dev/blog/)
- [Tailwind CSS blog](https://tailwindcss.com/blog)
- [shadcn/ui changelog](https://ui.shadcn.com/docs/changelog)
- [shadcn/ui: Base UI as the Default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)
- [shadcn/ui: Next.js インストール](https://ui.shadcn.com/docs/installation/next)
- [Biome blog](https://biomejs.dev/blog/)
- [Node.js previous releases](https://nodejs.org/en/about/previous-releases)
- npm registry(`npm view <pkg> version / time / engines / peerDependencies`、2026-11-18 実行): next, react, react-dom, tailwindcss, shadcn, typescript, eslint, eslint-config-next, typescript-eslint, pnpm, vitest, @playwright/test, @tanstack/react-query, @base-ui/react, radix-ui, @biomejs/biome, oxlint, babel-plugin-react-compiler ほか
