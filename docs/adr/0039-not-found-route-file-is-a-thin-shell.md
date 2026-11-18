---
type: ADR
title: "ADR-0039: 404 の画面は、アプリの not-found.tsx から同期の画面のコンポーネントを出し、Next.js の既定の画面を使わない"
description: "メインのレイアウトの中の 404 は app/(main)/not-found.tsx が _pages/not-found の同期のコンポーネントを出すだけにし、page・layout・default と同じ薄い殻としてカバレッジの外に置き、Playwright で確かめる。"
tags: [routing, coverage, ui]
status: stable
---

# ADR-0039: 404 の画面は、アプリの not-found.tsx から同期の画面のコンポーネントを出し、Next.js の既定の画面を使わない

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: ADR-0021、ADR-0022、#20

## 背景

- #20 の受け入れ条件は、無い ID と数字でない ID で「404 の画面」を出すこと。`notFound()` を呼ぶと、`not-found.tsx` が無いので Next.js 16.4.6 の既定の画面が、メインのレイアウトの真ん中に出ていた
- 既定の画面は自分の `<style>` を持ち、`@media (prefers-color-scheme: dark)` で `body` の背景を黒にする。OS が暗い設定で、アプリのテーマがライトだと、左のナビゲーションの黒い文字が黒い背景に消えた（2026-11-18、Chrome で確認。`docs/test-reports/evidence/issue-0020-post-detail/before-404-dark.jpg`）
- ADR-0021 は、カバレッジから外すルートの `app/` のファイルを `page`・`layout`・`default` の 3 種類に決めている。`not-found.tsx` はそこに無い

## 決定

- **メインのレイアウトの中の 404 は、`app/(main)/not-found.tsx` が `_pages/not-found` の同期の `NotFoundPage` を出す。** 画面は X に合わせ、「このページは存在しません。」「他のページを検索してみましょう。」と、検索（`/explore`）へのボタン
- **`not-found.tsx` は `page`・`layout`・`default` と同じ薄い殻に数える。** `_pages` のコンポーネントを出すだけで、判断を持たない。Vitest の `include` に入れず、Playwright で確かめる（`e2e/post-detail.spec.ts`）
- 画面の中身（文言・リンク）は `_pages/not-found` に置き、Vitest で 100% を測る

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
|---|---|---|
| **`app/(main)/not-found.tsx` から `_pages` の画面を出す（採用）** | テーマとシェルがそのまま効く。中身は単体のテストで測れる | ルートのファイルの種類が 1 つ増える（この ADR で記録） |
| Next.js の既定の画面のまま | 何も足さない | 暗い OS でナビゲーションが読めない。英語の文言 |
| 既定の画面の `<style>` を CSS で打ち消す | ファイルを足さない | Next.js の内部の作りに頼る。版が変わると壊れる |
| 詳細の画面の中で「見つかりません」を出す（`notFound()` を呼ばない） | ルートのファイルが要らない | 404 の扱いが画面ごとにばらける。ほかの画面の `notFound()` に効かない |

## 結果

- 良くなること: 404 の画面がアプリのテーマとシェルの中に出て、どの OS の設定でも読める
- 受け入れる負担: カバレッジの外のルートのファイルが 4 種類（`page`・`layout`・`default`・`not-found`）になる
- 守ること: `not-found.tsx` は `_pages` のコンポーネントを出すだけ。条件分岐・データの読み取りを書かない。ルートの `app/not-found.tsx`（どのルートにも当たらない URL）は、この ADR の範囲の外
