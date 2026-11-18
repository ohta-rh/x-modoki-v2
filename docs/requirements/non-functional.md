---
type: Requirements
title: "機能でない要件"
description: "アクセシビリティ・速さ・対応する環境・安全性・言語・保守の基準を、ID・数値・確かめ方で定める。"
tags: [requirements, non-functional, quality]
status: stable
---

# 機能でない要件

- ID は `NFR-<分類>-<連番>`。分類は A11Y（アクセシビリティ）・PERF（速さ）・COMPAT（対応する環境）・SEC（安全性）・I18N（言語）・MAINT（保守）
- 確かめ方の層は [機能の要件](functional.md) と同じ（単体・DAL・画面）。ほかに **CI**（GitHub Actions の確認）・**計測**（手元で測って記録する）を使う
- 対象はローカルの本番ビルド（`pnpm build && pnpm start`）。Cloudflare Workers の上での速さと可用性はマイルストーン 2 で決める

## アクセシビリティ（A11Y）

| ID | 基準 | 確かめ方 | 満たす PBI |
|---|---|---|---|
| NFR-A11Y-01 | ルーティングの 1 節の全ての画面が、3 つのテーマの全部で、WCAG 2.2 の A と AA の違反 0（axe-core） | 画面（`@axe-core/playwright`） | #31 |
| NFR-A11Y-02 | 文字と背景の色の差が 4.5:1 以上。18.66px 以上の太字と 24px 以上の文字は 3:1 以上 | 画面（axe） | #31 |
| NFR-A11Y-03 | 登録・投稿・返信・いいね・フォロー・検索・設定の変更を、キーボードだけでできる | 画面 | #31 |
| NFR-A11Y-04 | 全てのモーダルが、開くとフォーカスを中に閉じ込め、`Esc` で閉じ、閉じると開いた要素へフォーカスを戻す | 画面 | #28・#31 |
| NFR-A11Y-05 | フォーカスの輪が、キーボードで動かしたとき（`:focus-visible`）に、2px のアクセント色で出る | 画面 | #17 |
| NFR-A11Y-06 | アイコンだけのボタンの全てに、読み上げられる名前（`aria-label`）がある。画像の全てに `alt` がある | 単体・画面 | #17・#31 |
| NFR-A11Y-07 | OS が動きを減らす設定（`prefers-reduced-motion: reduce`）のとき、アニメーションをしない | 画面 | #21 |
| NFR-A11Y-08 | 全ての画面に、`nav`・`main`・`aside` のランドマークと、順の飛ばない見出しがある | 画面（axe） | #31 |

## 速さ（PERF）

| ID | 基準 | 確かめ方 | 満たす PBI |
|---|---|---|---|
| NFR-PERF-01 | `/home`・`/{username}`・`/{username}/status/{id}`・`/search`・`/notifications` の LCP が 2.5 秒以下（Lighthouse のモバイルの設定、ローカルの本番ビルド） | 計測 | #32 |
| NFR-PERF-02 | 同じ 5 つの画面の CLS が 0.1 以下 | 計測 | #32 |
| NFR-PERF-03 | 同じ 5 つの画面の INP が 200 ミリ秒以下（Lighthouse の実験室の測り方では TBT 200 ミリ秒以下を代わりに使う） | 計測 | #32 |
| NFR-PERF-04 | `/home` の最初の描画で流れる問い合わせが 6 回以下で、投稿が 20 件でも 40 件でも同じ回数 | DAL | #32 |
| NFR-PERF-05 | `/home` の最初に送る JavaScript が 200KB（gzip）以下 | 計測（`next build` の出力） | #32 |
| NFR-PERF-06 | 投稿が 10 万件あるデータベースで、「フォロー中」の 1 ページの問い合わせが 50 ミリ秒以下で、索引を使う | 計測（`EXPLAIN ANALYZE`） | #32 |
| NFR-PERF-07 | 新着と未読の確認の GET は 30 秒に 1 回で、タブが見えていない間は送らない | 画面 | #26・#28 |

## 対応する環境（COMPAT）

| ID | 基準 | 確かめ方 | 満たす PBI |
|---|---|---|---|
| NFR-COMPAT-01 | Chrome・Edge・Firefox は 111 以上、Safari は 16.4 以上で動く（Next.js 16 の対応の範囲と同じ） | 画面（Chromium・Firefox・WebKit の 3 つで Playwright） | #15 |
| NFR-COMPAT-02 | 画面の幅 360px から、横にスクロールせずに全ての機能を使える | 画面 | #17・#31 |
| NFR-COMPAT-03 | JavaScript を読み込み終える前でも、最初の描画で投稿の本文が読める（サーバーで描く） | 画面 | #19 |

## 安全性（SEC）

[アプリケーションの構造](../architecture/application-structure.md) の 6 節の 8 つの規則。脅威と対策と確かめるテストの対応は [脅威の洗い出し](../architecture/threat-model.md)。

| ID | 基準 | 確かめ方 | 満たす PBI |
|---|---|---|---|
| NFR-SEC-01 | 全ての Server Action と、ログインが要る全ての Route Handler が、`api` セグメントで認証と認可を行う。ログインしていなければ `UNAUTHORIZED`、他人のものへの変更は `FORBIDDEN`。`proxy.ts` の確認だけに頼らない | DAL（変更の関数ごとに、本人・他人・ログイン無しの 3 つ） | #18〜#29・#33 |
| NFR-SEC-02 | 全ての入力（フォーム・JSON・ルートの引数・検索の語）を Zod で確かめ、形が違えば `VALIDATION`（Route Handler は 400） | 単体・DAL | #18〜#29 |
| NFR-SEC-03 | クライアントへ渡すのは DTO だけで、パスワードのハッシュ・メールアドレス（本人の設定の画面を除く）・内部の列を含まない | DAL | #18〜#29・#33 |
| NFR-SEC-04 | セッションの cookie は HttpOnly・SameSite=Lax。本番では Secure | DAL | #18 |
| NFR-SEC-05 | 投稿（1 分に 10）・フォロー（1 分に 30）・画像の署名・ログインと登録（同じ IP から 1 分に 10）に回数の制限があり、超えると `RATE_LIMITED`（429） | DAL | #18・#19・#24・#25 |
| NFR-SEC-06 | 本文は文字として出し、HTML として解釈しない。リンクにするのは `http` と `https` の URL だけ | 単体 | #19 |
| NFR-SEC-07 | 画像は、署名の前に種類と大きさを、置かれたあとに先頭のバイトで種類と縦横を確かめる。アプリとは別のドメイン（ローカルは別のポート）から出す | DAL | #25 |
| NFR-SEC-08 | 秘密の値は環境変数だけに置き、`src/shared/config/env.ts` で検証する。`NEXT_PUBLIC_` を付けるのは公開してよい値だけ。リポジトリに秘密の値が無い | 単体・CI | #15・#33 |
| NFR-SEC-09 | 応答に `Content-Security-Policy`・`X-Content-Type-Options: nosniff`・`Referrer-Policy`・`X-Frame-Options: DENY` が付く | 画面 | #33 |
| NFR-SEC-10 | ログインのあとの戻り先は、同じサイトの中のパスだけを受け付ける（開いた転送をしない） | DAL・画面 | #18 |
| NFR-SEC-11 | 依存に、重大と高の脆弱性が無い（`pnpm audit --prod --audit-level high`） | CI | #33・#37 |

## 言語（I18N）

| ID | 基準 | 確かめ方 | 満たす PBI |
|---|---|---|---|
| NFR-I18N-01 | 画面の文言は日本語。`<html lang="ja">` | 単体・画面 | #15 |
| NFR-I18N-02 | 時刻は日本の形（`N秒`・`N分`・`N時間`・`M月D日`・`YYYY年M月D日`）、数は日本の省略（`1.2万`・`3.4億`）で出す | 単体 | #19 |
| NFR-I18N-03 | 日本語・絵文字・結合文字・右から左の文字を含む本文が、崩れずに保存され、出る | DAL・画面 | #19・#34 |

## 保守（MAINT）

| ID | 基準 | 確かめ方 | 満たす PBI |
|---|---|---|---|
| NFR-MAINT-01 | Vitest のカバレッジが、行・分岐・関数・文の全部で 100%（外してよいのは ADR-0021 と ADR-0022 の 4 種類だけ） | CI | #15 から全部 |
| NFR-MAINT-02 | CI の 7 つの確認（ドキュメント・型・lint・整形・テストとカバレッジ・ビルド・画面のテスト）が、全ての push で通る | CI | #15 から全部 |
| NFR-MAINT-03 | Steiger（FSD）の違反と、ESLint の `no-restricted-imports` の違反が 0 | CI | #15 から全部 |
| NFR-MAINT-04 | 全ての画面のルートに、Playwright のテストが 1 本以上ある | 画面 | #30 |
| NFR-MAINT-05 | `docs/` が OKF の形で、`node scripts/check-docs.mjs` が通る | CI | 全部 |
| NFR-MAINT-06 | サーバーのコードに、Workers で動かないもの（ネイティブのモジュール・`fs` への書き込み・モジュールの一番上の接続・リクエストをまたぐ変数）が無い | CI（ESLint） | #15 から全部 |
