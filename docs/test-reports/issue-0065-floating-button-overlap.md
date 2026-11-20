---
type: TestReport
title: "試験レポート: 狭い画面と低い画面で、浮かぶ投稿ボタンが「保存」と「ポストする」に重なって押せない"
description: "#65 で、640px より狭い画面の浮かぶ投稿ボタンを投稿と設定の画面では出さず、メインの下に余白を取り、保存とポストするが押せることを 3 つのブラウザと本物の Chrome で確かめた記録。"
tags: [test-report, layout, narrow, bug]
status: stable
---

# 試験レポート: 狭い画面と低い画面で、浮かぶ投稿ボタンが「保存」と「ポストする」に重なって押せない

## 対象

- issue: [#65](https://github.com/ohta-rh/x-modoki-v2/issues/65)（バグ。#34 の探索的テストで見つけた）
- commit: `abc9ab0`、レビューの指摘を直した `870600b`（ブランチ `m1/local-app`、PR #40）
- CI: [実行 44484524397](https://github.com/ohta-rh/x-modoki-v2/actions/runs/44484524397)（成功）
- 日付: 2026-11-19

## 環境

- macOS 26.2、Google Chrome（拡張から操作、と Playwright 1.65.0 の `channel: 'chrome'`）、Node.js 26.12.0（`.nvmrc` は 24。CI の実行を本当の結果とする）、Docker Compose の PostgreSQL
- 動かし方: `pnpm build && pnpm start -p 3001`。Chrome の確認用の架空の人（`chrome_check18`、テーマ dim）と、確かめるために登録した架空の人（`hand_n93d5q`、ライト）

## 判定

合格 — 受け入れ条件 4 件のうち 4 件を満たした。

## 受け入れ条件ごとの結果

| # | 条件 | 確かめ方 | 結果 | エビデンス |
|---|---|---|---|---|
| 1 | 640px 未満で、`/compose/post` と `/settings` 以下では浮かぶ投稿ボタンを出さない | `e2e/narrow.spec.ts` › 浮かぶ投稿ボタンと、画面の下の操作（#65） | 合格 | テストの名前のとおり |
| 2 | 浮かぶボタンが出る画面では、いちばん下の中身をボタンより上まで送れる | 同上 › いちばん下の中身をボタンより上まで送れる（375×667 の `/home`） | 合格 | テストの名前のとおり |
| 3 | 375×667・320×568 の「保存」、320×300 の「ポストする」が押せる | 同上 › 3 つの大きさ | 合格 | テストの名前のとおり |
| 4 | CI が緑で、カバレッジが 100% のまま | CI の実行 | 合格 | CI の実行 |

## 自動のテスト

`PORT=3300 pnpm verify` が 0 で終わった（`870600b`）: 単体のテスト 184 ファイル 1033 本、カバレッジ 4 つとも 100%、画面のテスト 327 本（Chromium・Firefox・WebKit）。CI でも同じ 7 つが通った。

### TDD の記録

| # | 振る舞い | 先に書いたテスト | 赤（落ちた理由） | 緑にした実装 |
|---|---|---|---|---|
| 1 | 浮かぶボタンの出る画面で、最後の中身をボタンより上まで送れる | `e2e/narrow.spec.ts` › いちばん下の中身を… | `Expected: <= 531` `Received: 601.5` | `app-shell.tsx`（`pb-[136px] sm:pb-0`） |
| 2 | 投稿と設定の画面では浮かぶボタンを出さない | `app-shell.test.tsx` › 投稿の画面と設定の画面では… | `/compose/post: expected [ <a aria-label="ポストする" …> ] to have a length of +0 but got 1` | `app-shell.tsx`（`floating`） |
| 3 | メインの下に余白を取る | `app-shell.test.tsx` › 640px 未満のメインの下には… | `expect(element).toHaveClass("pb-[136px] sm:pb-0")` | `app-shell.tsx` |
| 4 | `settings_fan` のプロフィールではボタンを出す（レビュー 1） | 同上 › `/settings_fan` | `/settings_fan: expected [] to have a length of 1 but got +0` | `app-shell.tsx`（`/settings` と `/settings/` 以下だけ） |

## コードレビュー

- 判定: APPROVE（1 回目、#65〜#73 をまとめて）　範囲: `origin/m1/local-app...abc9ab0`　レビューした sub agent: code-reviewer（opus）

| # | 重さ | 指摘 | 確かめた結果 | 対応 |
|---|---|---|---|---|
| 1 | minor | `app-shell.tsx:34` の `currentPath.startsWith('/settings')` は、名前が settings で始まる人のプロフィールにも当たる（`settings_fan` は作れる） | 再現した（`/settings_fan` でボタンが消えるテストが赤） | 直した（`870600b`）。`/settings` と `/settings/` 以下だけを見る。テスト: `app-shell.test.tsx` に `/settings_fan`・`/settings_fan/status/1` を足した |
| 2 | minor | #66 の条件は名前・自己紹介・場所・URL だが、テストは URL を確かめていない | 正しい（今の作りは正しいが、見張りが無い）。URL の NFC を外すと落ちることを確かめた | 直した（`870600b`）。テスト: `schema.test.ts` に `https://ex.test/` + か + U+3099 を足した |

## ブラウザでの確認

| URL | 幅 | テーマ | した操作 | 見えた結果 | 画面の写真 |
|---|---|---|---|---|---|
| `/settings/profile` | 375 | ライト | 開いた | 浮かぶボタンが無く、保存に重ならない | `65-settings-profile-375.jpg` |
| `/compose/post` | 375 | ライト | 開いた | 浮かぶボタンが無い | `65-compose-post-375.jpg` |
| `/home` | 375 | ライト | 開いた（変えていない隣の画面） | 浮かぶボタンはあり、下のナビゲーションと重ならない | `65-home-375.jpg` |
| `/settings/profile` | 1280 | ライト | 開いた | 崩れない | `settings-1280.jpg` |
| `/settings/profile` | 768 | ライト | 開いた | 崩れない | `settings-768.jpg` |
| `/settings/profile` | 375 | ライト | 開いた | 崩れない、横にはみ出さない | `settings-375.jpg` |

- コンソール: エラー 0、警告 0　通信: 失敗 0（`chrome-evidence.mjs` の読み込みと、Playwright の Chrome での操作。わざと通信を切った間の失敗と、壊れた URL の 404 は除く）
- 1422px の写真は、拡張から操作した Chrome の窓の幅（`innerWidth` で測った）

![/settings/profile（375px）](evidence/issue-0065-floating-button-overlap/65-settings-profile-375.jpg)
![/compose/post（375px）](evidence/issue-0065-floating-button-overlap/65-compose-post-375.jpg)
![/home（375px）](evidence/issue-0065-floating-button-overlap/65-home-375.jpg)
![/settings/profile（1280px）](evidence/issue-0065-floating-button-overlap/settings-1280.jpg)
![/settings/profile（768px）](evidence/issue-0065-floating-button-overlap/settings-768.jpg)
![/settings/profile（375px）](evidence/issue-0065-floating-button-overlap/settings-375.jpg)

## 見つけた問題

なし
