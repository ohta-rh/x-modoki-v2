---
type: TestReport
title: "試験レポート: 解読できない % を含む URL で、素の「Internal Server Error」（500）が出る"
description: "#73 で、解読できない % を含む URL を proxy.ts で 404 の画面へ書き換え、素の 500 が出なくなったことと、正しい URL とログインの判定が変わらないことを確かめた記録（ADR-0063）。"
tags: [test-report, routing, proxy, bug]
status: stable
---

# 試験レポート: 解読できない % を含む URL で、素の「Internal Server Error」（500）が出る

## 対象

- issue: [#73](https://github.com/ohta-rh/x-modoki-v2/issues/73)（バグ。#34 の探索的テストで見つけた）
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
| 1 | 解読できない `%` を含む URL は 404 で、ほかの無い URL と同じ「見つからない」の画面 | `e2e/malformed-url.spec.ts` › 解読できない % を含む URL は 404 で… | 合格 | テストの名前のとおり |
| 2 | 正しく符号化された URL と、ふつうの URL は今までどおり | `proxy.test.ts` の 3 本、`e2e/auth.spec.ts`（ログインへ送る） | 合格 | テストの名前のとおり |
| 3 | CI が緑で、カバレッジが 100% のまま | CI の実行 | 合格 | CI の実行 |

## 自動のテスト

`PORT=3300 pnpm verify` が 0 で終わった（`870600b`）: 単体のテスト 184 ファイル 1033 本、カバレッジ 4 つとも 100%、画面のテスト 327 本（Chromium・Firefox・WebKit）。CI でも同じ 7 つが通った。

### TDD の記録

| # | 振る舞い | 先に書いたテスト | 赤（落ちた理由） | 緑にした実装 |
|---|---|---|---|---|
| 1 | 壊れた URL が 404（受け入れのテスト） | `e2e/malformed-url.spec.ts` | `/%ZZ` `Expected: 404` `Received: 500`（最初は使い捨ての試しのビルドが残っていて通ってしまったので、元の `proxy.ts` で作り直して赤を見た） | `proxy.ts` |
| 2 | 壊れたパスを `/404` へ書き換える、% を matcher に足す | `proxy.test.ts` › 解読できない % を含むパスは…、matcher のテスト | `expected null to be 'http://localhost:3000/404'`、`expected [ Array(8) ] to deeply equal [ Array(9) ]` | `proxy.ts` |
| 3 | 正しく符号化された公開の画面は通す | `proxy.test.ts` › 正しく符号化された公開の画面は… | `expected null to be '1'` | `proxy.ts`（`NEEDS_LOGIN`） |
| 4 | ログインが要るかを matcher と同じ形で見分ける | `proxy.test.ts` › % を含むパスでも通るので… | 実装のあとに書いたので、`NEEDS_LOGIN` の確認を外して `/: expected null to be '1'` で落ちるのを確かめた | `proxy.ts` |

## コードレビュー

- 判定: APPROVE（1 回目、#65〜#73 をまとめて）　範囲: `origin/m1/local-app...abc9ab0`　レビューした sub agent: code-reviewer（opus）

| # | 重さ | 指摘 | 確かめた結果 | 対応 |
|---|---|---|---|---|
| 1 | minor | `app-shell.tsx:34` の `currentPath.startsWith('/settings')` は、名前が settings で始まる人のプロフィールにも当たる（`settings_fan` は作れる） | 再現した（`/settings_fan` でボタンが消えるテストが赤） | 直した（`870600b`）。`/settings` と `/settings/` 以下だけを見る。テスト: `app-shell.test.tsx` に `/settings_fan`・`/settings_fan/status/1` を足した |
| 2 | minor | #66 の条件は名前・自己紹介・場所・URL だが、テストは URL を確かめていない | 正しい（今の作りは正しいが、見張りが無い）。URL の NFC を外すと落ちることを確かめた | 直した（`870600b`）。テスト: `schema.test.ts` に `https://ex.test/` + か + U+3099 を足した |

## ブラウザでの確認

| URL | 幅 | テーマ | した操作 | 見えた結果 | 画面の写真 |
|---|---|---|---|---|---|
| `/x/status/%ZZ` | 1422 | — | 開いた | 404 の画面（ほかの無い URL と同じ Next.js の画面） | `73-malformed-chrome.jpg` |
| `/x/status/%ZZ` | 1280 | — | 開いた | 404 | `malformed-1280.jpg` |
| `/x/status/%ZZ` | 768 | — | 開いた | 404 | `malformed-768.jpg` |
| `/x/status/%ZZ` | 375 | — | 開いた | 404 | `malformed-375.jpg` |

- コンソール: エラー 0、警告 0　通信: 失敗 0（`chrome-evidence.mjs` の読み込みと、Playwright の Chrome での操作。わざと通信を切った間の失敗と、壊れた URL の 404 は除く）
- 1422px の写真は、拡張から操作した Chrome の窓の幅（`innerWidth` で測った）

![/x/status/%ZZ（1422px）](evidence/issue-0073-malformed-url-404/73-malformed-chrome.jpg)
![/x/status/%ZZ（1280px）](evidence/issue-0073-malformed-url-404/malformed-1280.jpg)
![/x/status/%ZZ（768px）](evidence/issue-0073-malformed-url-404/malformed-768.jpg)
![/x/status/%ZZ（375px）](evidence/issue-0073-malformed-url-404/malformed-375.jpg)

## 見つけた問題

1. どのルートにも当たらない URL（壊れた URL もここへ書き換える）の 404 は、Next.js の英語の黒い画面のまま。ADR-0039 で範囲の外にしたもので、この PBI の受け入れ条件（ほかの無い URL と同じ画面）は満たす。改善の候補として #34 の記録に残した
