---
type: ADR
title: "ADR-0062: 誤りの画面は、アプリの error.tsx と global-error.tsx から日本語の同期の画面を出し、ボタンでページを読み込み直す"
description: "予期しない例外で Next.js の英語の画面が出ていたので、app/(main)/error.tsx と app/global-error.tsx を _pages/error の部品を出すだけの薄い殻として足し、もう一度読み込むボタンは reset ではなくページの読み込み直しにする。"
tags: [routing, coverage, ui, error]
status: stable
---

# ADR-0062: 誤りの画面は、アプリの error.tsx と global-error.tsx から日本語の同期の画面を出し、ボタンでページを読み込み直す

- ステータス: 採用
- 日付: 2026-11-19
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: #71、#34、ADR-0021、ADR-0039

## 背景

- `app/` に `error.tsx` も `global-error.tsx` も無く、描画の中の予期しない例外は Next.js 16.4.6 の英語の画面（「This page couldn't load」）になった（#34 の探索的テスト、`e2e/error-page.spec.ts` の赤）
- ADR-0039 は、カバレッジの外に置くルートのファイルを `page`・`layout`・`default`・`not-found` の 4 種類に決めている。`error`・`global-error` はそこに無い
- `error.tsx` は Next.js から `reset` を受け取る。`reset` は同じ部分をもう一度描くだけで、読み込み済みの壊れたデータ（たとえば TanStack Query のキャッシュ）はそのまま残るので、同じ例外がまた起きる
- `global-error.tsx` は根のレイアウトの代わりに出るので、自分で `<html>` と `<body>` と CSS を持つ必要がある

## 決定

- **`app/(main)/error.tsx` と `app/global-error.tsx` は、`_pages/error` の `ErrorPage` / `GlobalErrorPage` を再び出すだけの薄い殻にする。** `'use client'` と、`global-error.tsx` だけ CSS の読み込みを持つ。条件分岐もデータの読み取りも書かない
- **`error`・`global-error` を、ADR-0039 の 4 種類に足して、カバレッジの外のルートのファイルに数える**（6 種類）。中身は `_pages/error` に置き、Vitest で 100% を測る。ルートとしての振る舞いは Playwright で確かめる
- 文言は「問題が起きました」「読み込み直すと、続きから使えます。」と「もう一度読み込む」のボタン。**ボタンはページを読み込み直す**（`window.location.reload()`）。`reset` は使わない
- 根の `app/error.tsx`（`(main)` の外の、ログインの前の画面）は置かない。そこでの例外は `global-error.tsx` が受ける

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
|---|---|---|
| **薄い殻から `_pages` の画面を出し、読み込み直す（採用）** | ADR-0039 と同じ形。中身は単体のテストで測れる。読み込み直すと壊れたキャッシュも消える | 画面全体を読み込み直すので、スクロールの位置などは失う |
| ボタンで `reset` を呼ぶ | 画面を読み込み直さない | 壊れたデータが残り、同じ例外で同じ画面に戻る |
| `reset` と `router.refresh()` を一緒に呼ぶ | サーバーのデータは読み直す | ブラウザの側のキャッシュ（TanStack Query）は残る |
| Next.js の既定の画面のまま | 何も足さない | 英語。アプリのテーマが効かない |

## 結果

- 良くなること: 予期しない例外でも日本語の画面が出て、ボタン 1 つで元に戻れる
- 受け入れる負担: カバレッジの外のルートのファイルが 6 種類（`page`・`layout`・`default`・`not-found`・`error`・`global-error`）になる
- 守ること: `error.tsx`・`global-error.tsx` は `_pages/error` の部品を出すだけ。誤りの記録の送り先（マイルストーン 2）を足すときは、`_pages/error` の中に足し、単体のテストで測る
