---
type: TestReport
title: "試験レポート: 詳細の画面で返信してから戻ると、ホームのカードの返信と表示の数が古いまま"
description: "#69 で、詳細の画面で返信したときと表示を数えたときに、一覧のキャッシュのその投稿の数を 1 増やし、戻ったホームのカードに新しい数が出ることを 3 つのブラウザと本物の Chrome で確かめた記録。"
tags: [test-report, counts, cache, bug]
status: stable
---

# 試験レポート: 詳細の画面で返信してから戻ると、ホームのカードの返信と表示の数が古いまま

## 対象

- issue: [#69](https://github.com/ohta-rh/x-modoki-v2/issues/69)（バグ。#34 の探索的テストで見つけた）
- commit: `abc9ab0`、レビューの指摘を直した `870600b`（ブランチ `m1/local-app`、PR #40）
- CI: [実行 44484524397](https://github.com/ohta-rh/x-modoki-v2/actions/runs/44484524397)（成功）
- 日付: 2026-11-19

## 環境

- macOS 26.2、Google Chrome（拡張から操作、と Playwright 1.65.0 の `channel: 'chrome'`）、Node.js 26.12.0（`.nvmrc` は 24。CI の実行を本当の結果とする）、Docker Compose の PostgreSQL
- 動かし方: `pnpm build && pnpm start -p 3001`。Chrome の確認用の架空の人（`chrome_check18`、テーマ dim）と、確かめるために登録した架空の人（`hand_n93d5q`、ライト）

## 判定

合格 — 受け入れ条件 3 件のうち 3 件を満たした。

## 受け入れ条件ごとの結果

| # | 条件 | 確かめ方 | 結果 | エビデンス |
|---|---|---|---|---|
| 1 | 詳細で返信して戻ると、ホームのカードの返信の数が 1 増えている | `e2e/post-detail.spec.ts` › 詳細で返信して戻ると、ホームのカードの返信と表示の数が増えている（#69） | 合格 | テストの名前のとおり |
| 2 | 表示の数も 1 増えている | 同上、`view-counter.test.tsx` › 数えたら… | 合格 | テストの名前のとおり |
| 3 | CI が緑で、カバレッジが 100% のまま | CI の実行 | 合格 | CI の実行 |

## 自動のテスト

`PORT=3300 pnpm verify` が 0 で終わった（`870600b`）: 単体のテスト 184 ファイル 1033 本、カバレッジ 4 つとも 100%、画面のテスト 327 本（Chromium・Firefox・WebKit）。CI でも同じ 7 つが通った。

### TDD の記録

| # | 振る舞い | 先に書いたテスト | 赤（落ちた理由） | 緑にした実装 |
|---|---|---|---|---|
| 1 | 戻ったカードの返信と表示が 1（受け入れのテスト） | `e2e/post-detail.spec.ts` › 詳細で返信して戻ると… | `getByText('返信 1')` `Expected: 1` `Received: 0` | `post-thread.tsx`・`view-counter.tsx` |
| 2 | 返信が通ると一覧のキャッシュの返信の数を 1 増やす | `post-thread.test.tsx` › 返信が通ると… | `expected [ +0, +0 ] to deeply equal [ 1, +0 ]` | `post-thread.tsx`（`updatePostInCaches`） |
| 3 | 表示を数えたら一覧のキャッシュの表示の数を 1 増やす | `view-counter.test.tsx` › 数えたら… | `expected [ 5, 5 ] to deeply equal [ 6, 5 ]` | `view-counter.tsx`。`updatePostInCaches` を `widgets/timeline-feed` から `entities/post` へ移した（issue の `onCounted` の代わり。下の層から使えるようにした） |

## コードレビュー

- 判定: APPROVE（1 回目、#65〜#73 をまとめて）　範囲: `origin/m1/local-app...abc9ab0`　レビューした sub agent: code-reviewer（opus）

| # | 重さ | 指摘 | 確かめた結果 | 対応 |
|---|---|---|---|---|
| 1 | minor | `app-shell.tsx:34` の `currentPath.startsWith('/settings')` は、名前が settings で始まる人のプロフィールにも当たる（`settings_fan` は作れる） | 再現した（`/settings_fan` でボタンが消えるテストが赤） | 直した（`870600b`）。`/settings` と `/settings/` 以下だけを見る。テスト: `app-shell.test.tsx` に `/settings_fan`・`/settings_fan/status/1` を足した |
| 2 | minor | #66 の条件は名前・自己紹介・場所・URL だが、テストは URL を確かめていない | 正しい（今の作りは正しいが、見張りが無い）。URL の NFC を外すと落ちることを確かめた | 直した（`870600b`）。テスト: `schema.test.ts` に `https://ex.test/` + か + U+3099 を足した |

## ブラウザでの確認

| URL | 幅 | テーマ | した操作 | 見えた結果 | 画面の写真 |
|---|---|---|---|---|---|
| `/home?tab=following` | 1422 | dim | 投稿 → 詳細 → 返信 → 戻る | カードに返信 1・表示 1 | `69-back-counts.jpg` |
| `/home` | 768 | ライト | 開いた（変えていない隣の画面） | 崩れない、横にはみ出さない | `home-768.jpg` |
| `/home` | 375 | ライト | 開いた（変えていない隣の画面） | 崩れない、横にはみ出さない | `home-375.jpg` |

- コンソール: エラー 0、警告 0　通信: 失敗 0（`chrome-evidence.mjs` の読み込みと、Playwright の Chrome での操作。わざと通信を切った間の失敗と、壊れた URL の 404 は除く）
- 1422px の写真は、拡張から操作した Chrome の窓の幅（`innerWidth` で測った）

![/home?tab=following（1422px）](evidence/issue-0069-counts-after-back/69-back-counts.jpg)
![/home（768px）](evidence/issue-0069-counts-after-back/home-768.jpg)
![/home（375px）](evidence/issue-0069-counts-after-back/home-375.jpg)

## 見つけた問題

なし
