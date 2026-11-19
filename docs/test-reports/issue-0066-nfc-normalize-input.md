---
type: TestReport
title: "試験レポート: NFD の文字で検索すると、NFC で保存した投稿が見つからない（入力の正規化がそろっていない）"
description: "#66 で、検索の語とプロフィールの欄を NFC にそろえ、濁点を分けて書いた（NFD の）語でも NFC で保存した投稿が見つかることを、単体のテストと本物の Chrome で確かめた記録。"
tags: [test-report, search, unicode, bug]
status: stable
---

# 試験レポート: NFD の文字で検索すると、NFC で保存した投稿が見つからない（入力の正規化がそろっていない）

## 対象

- issue: [#66](https://github.com/ohta-rh/x-modoki-v2/issues/66)（バグ。#34 の探索的テストで見つけた）
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
| 1 | 検索の語は NFC にそろえてから探す。NFD の語でも、NFC で保存した投稿と人が見つかる | `search-query.test.ts`、`load-search-page.test.ts` › 濁点を分けて書いた（NFD の）語でも…（issue の `search-posts.test.ts` の代わりに、検索の画面の読み込みで本物の PostgreSQL に問い合わせた。人の検索も同じ `searchQuery` を通る） | 合格 | テストの名前のとおり |
| 2 | プロフィールの名前・自己紹介・場所・URL は NFC にそろえて保存する | `schema.test.ts` › 文字の項目は NFC にそろえて保存する | 合格 | テストの名前のとおり |
| 3 | CI が緑で、カバレッジが 100% のまま | CI の実行 | 合格 | CI の実行 |

## 自動のテスト

`PORT=3300 pnpm verify` が 0 で終わった（`870600b`）: 単体のテスト 184 ファイル 1033 本、カバレッジ 4 つとも 100%、画面のテスト 327 本（Chromium・Firefox・WebKit）。CI でも同じ 7 つが通った。

### TDD の記録

| # | 振る舞い | 先に書いたテスト | 赤（落ちた理由） | 緑にした実装 |
|---|---|---|---|---|
| 1 | NFD の語を NFC にそろえる | `search-query.test.ts` › NFD の語は… | `expected 'がテスト' to be 'がテスト'`（見た目は同じで、バイトが違う） | `search-query.ts`（`normalize('NFC')`） |
| 2 | 100 文字は NFC にそろえたあとで数える | `search-query.test.ts` › 前後の空白を除き、1〜100 文字… | `expected null to be 'ががが…'` | `search-query.ts` |
| 3 | プロフィールの欄を NFC にそろえる | `schema.test.ts` › 文字の項目は NFC に… | `expected [ 'が', 'é', 'パ' ] to deeply equal [ 'が', 'é', 'パ' ]` | `schema.ts`（`text()`） |
| 4 | NFD の語で NFC の投稿が見つかる | `load-search-page.test.ts` › 濁点を分けて書いた… | `expected [] to deeply equal [ 'がっこうの話' ]` | `search-query.ts` |
| 5 | URL の欄も NFC（レビュー 2。見張りのテスト） | `schema.test.ts` › 同上に URL を足した | URL の `normalize` を外すと `expected [ …, 'https://ex.test/が' ] to deeply equal [ …, 'https://ex.test/が' ]` | 変更なし（今の作りが正しい） |

## コードレビュー

- 判定: APPROVE（1 回目、#65〜#73 をまとめて）　範囲: `origin/m1/local-app...abc9ab0`　レビューした sub agent: code-reviewer（opus）

| # | 重さ | 指摘 | 確かめた結果 | 対応 |
|---|---|---|---|---|
| 1 | minor | `app-shell.tsx:34` の `currentPath.startsWith('/settings')` は、名前が settings で始まる人のプロフィールにも当たる（`settings_fan` は作れる） | 再現した（`/settings_fan` でボタンが消えるテストが赤） | 直した（`870600b`）。`/settings` と `/settings/` 以下だけを見る。テスト: `app-shell.test.tsx` に `/settings_fan`・`/settings_fan/status/1` を足した |
| 2 | minor | #66 の条件は名前・自己紹介・場所・URL だが、テストは URL を確かめていない | 正しい（今の作りは正しいが、見張りが無い）。URL の NFC を外すと落ちることを確かめた | 直した（`870600b`）。テスト: `schema.test.ts` に `https://ex.test/` + か + U+3099 を足した |

## ブラウザでの確認

| URL | 幅 | テーマ | した操作 | 見えた結果 | 画面の写真 |
|---|---|---|---|---|---|
| `/search?q=サンプル（NFD）` | 1422 | dim | NFD で「サンプル」を検索した | 13 件の投稿が出る（語は 5 文字の NFC にそろった） | `66-nfd-search.jpg` |
| `/home` | 768 | ライト | 開いた（変えていない隣の画面） | 崩れない、横にはみ出さない | `home-768.jpg` |
| `/home` | 375 | ライト | 開いた（変えていない隣の画面） | 崩れない、横にはみ出さない | `home-375.jpg` |

- コンソール: エラー 0、警告 0　通信: 失敗 0（`chrome-evidence.mjs` の読み込みと、Playwright の Chrome での操作。わざと通信を切った間の失敗と、壊れた URL の 404 は除く）
- 1422px の写真は、拡張から操作した Chrome の窓の幅（`innerWidth` で測った）

![/search?q=サンプル（NFD）（1422px）](evidence/issue-0066-nfc-normalize-input/66-nfd-search.jpg)
![/home（768px）](evidence/issue-0066-nfc-normalize-input/home-768.jpg)
![/home（375px）](evidence/issue-0066-nfc-normalize-input/home-375.jpg)

## 見つけた問題

なし
