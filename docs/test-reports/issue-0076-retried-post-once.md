---
type: TestReport
title: "試験レポート: 投稿の応答が届かずにやり直すと、同じ投稿が 2 つできる"
description: "#76 で、応答だけが失われた投稿をやり直しても、1 分以内の同じ中身の投稿は前の投稿を返して 1 つだけになることを、本物の PostgreSQL と 3 つのブラウザと本物の Chrome で確かめた記録（ADR-0064）。"
tags: [test-report, posting, reliability, bug]
status: stable
---

# 試験レポート: 投稿の応答が届かずにやり直すと、同じ投稿が 2 つできる

## 対象

- issue: [#76](https://github.com/ohta-rh/x-modoki-v2/issues/76)（バグ。#34 の探索的テストの 2 巡目で見つけた）
- commit: `42860d8`、レビューの指摘を直した `aac24c6`（ブランチ `m1/local-app`、PR #40）
- CI: [実行 44492932183](https://github.com/ohta-rh/x-modoki-v2/actions/runs/44492932183)（成功）
- 日付: 2026-11-19

## 環境

- macOS 26.2、Google Chrome（拡張から操作、と Playwright 1.65.0 の `channel: 'chrome'`）、Node.js 26.12.0（`.nvmrc` は 24。CI の実行を本当の結果とする）、Docker Compose の PostgreSQL
- 動かし方: `pnpm build && pnpm start -p 3001`。Chrome の確認用の架空の人（`chrome_check18`、テーマ dim）と、確かめるために登録した架空の人（`hand_n93d5q`、ライト）

## 判定

合格 — 受け入れ条件 4 件のうち 4 件を満たした。

## 受け入れ条件ごとの結果

| # | 条件 | 確かめ方 | 結果 | エビデンス |
|---|---|---|---|---|
| 1 | 同じ人が同じ本文・返信先・引用元・画像の投稿を 60 秒以内にもう一度送ると、前の投稿の ID で成功を返す | `create-post.test.ts` › 応答が届かずに同じ投稿を… / 同じ返信・同じ画像の… | 合格 | テストの名前のとおり |
| 2 | 応答を切ったあとのやり直しで、投稿は 1 つだけ | `e2e/offline.spec.ts` › 投稿の応答が届かずにやり直しても…（#76） | 合格 | テストの名前のとおり |
| 3 | 60 秒を過ぎた・返信先や画像が違う・ほかの人の・消した同じ本文は別の投稿 | `create-post.test.ts` › 返信先・引用元・画像が違う… | 合格 | テストの名前のとおり |
| 4 | CI が緑で、カバレッジが 100% のまま | CI の実行 | 合格 | CI の実行 |

## 自動のテスト

`PORT=3300 pnpm verify` が 0 で終わった（`aac24c6`）: 単体のテスト 185 ファイル 1048 本、カバレッジ 4 つとも 100%、画面のテスト 345 本（Chromium・Firefox・WebKit）。CI でも同じ 7 つが通った。

- その前の 1 回（`42860d8` の前の手元の確かめ）で、WebKit の 1 本の登録が 5 秒で終わらず、続く WebKit の 7 本が打ち切られた。同じ WebKit の 14 本を流し直すと全部通り、そのあとの 3 回の `pnpm verify` も通った。原因は分からない（サーバーの応答が遅れた 1 回）

### TDD の記録

| # | 振る舞い | 先に書いたテスト | 赤（落ちた理由） | 緑にした実装 |
|---|---|---|---|---|
| 1 | 1 つだけ（受け入れのテスト） | `e2e/offline.spec.ts` › 投稿の応答が届かずに… | `getByRole('article')` `Expected: 1` `Received: 2` | `create-post.ts` |
| 2 | 前の投稿の ID で成功を返す | `create-post.test.ts` › 応答が届かずに… | `expected { ok: true, id: '…819' } to deeply equal { ok: true, id: '…471' }` | `create-post.ts`（60 秒以内の同じ中身を探す） |
| 3 | 返信と画像のやり直しもまとめる | 同 › 同じ返信・同じ画像の… | `expected { ok: false, error: 'VALIDATION' } to deeply equal { ok: true, … }` | 同上 |
| 4 | 別の投稿になる場合（見張り） | 同 › 返信先・引用元・画像が違う… | 今の作りで通る（入れたあとも通ることの見張り） | 変更なし |

## コードレビュー

- 判定: APPROVE（1 回目、#74〜#79 をまとめて）　範囲: `origin/m1/local-app...42860d8`　レビューした sub agent: code-reviewer（opus）

| # | 重さ | 指摘 | 確かめた結果 | 対応 |
|---|---|---|---|---|
| 1 | minor | `use-moved-away.ts` の見張りは、開いてからの全部の `a[href]` のクリックを数える。保存の前のクリックや、新しいタブで開くクリック（Cmd・Ctrl・Shift、`target="_blank"`）のあとに保存すると、プロフィールへ移らない | 再現した（保存の前と Cmd のクリックのテストが赤、`expected "vi.fn()" to be called with arguments: [ '/hanako' ]`） | 直した（`aac24c6`）。フォームを送るたびに見張りを始め直し、別のタブや窓へのクリックは数えない。テスト: `profile-edit.test.tsx` の 4 本 |
| 2 | minor | #74 の条件はフォロワーの一覧を含むが、ブラウザのテストが開いていない | 正しい | 直した（`aac24c6`）。`e2e/narrow.spec.ts` の #74 で、長い名前の人がフォローして `/<相手>/followers` を 320・1280px で開く |
| 3 | minor | #75 の 4 つのダイアログのうち、ブラウザで確かめたのは削除だけ。引用は自分の並べ方を持つ | 正しい（引用は 1 巡目の証拠の閉じるボタンが −12 だったもの） | 直した（`aac24c6`）。`e2e/narrow.spec.ts` の #75 で、引用のダイアログも 320×200 で確かめる |

## ブラウザでの確認

| URL | 幅 | テーマ | した操作 | 見えた結果 | 画面の写真 |
|---|---|---|---|---|---|
| `/home?tab=following` | 1280 | ライト | 投稿の応答だけを切って、もう一度押した | 一覧に 1 つ。データベースの行も 1 | `76-one-post-1280.jpg` |
| `/home` | 768 | ライト | 開いた（変えていない隣の画面） | 崩れない、横にはみ出さない | `home-768.jpg` |
| `/home` | 375 | ライト | 開いた（変えていない隣の画面） | 崩れない、横にはみ出さない | `home-375.jpg` |

- コンソール: エラー 0、警告 0　通信: 失敗 0（`chrome-evidence.mjs` の読み込みと、Playwright の Chrome での操作。わざと通信を切った間の失敗と、壊れた URL の 404 は除く）
- 1400px の写真は、拡張から操作した Chrome の窓の幅

![/home?tab=following（1280px）](evidence/issue-0076-retried-post-once/76-one-post-1280.jpg)
![/home（768px）](evidence/issue-0076-retried-post-once/home-768.jpg)
![/home（375px）](evidence/issue-0076-retried-post-once/home-375.jpg)

## 見つけた問題

なし
