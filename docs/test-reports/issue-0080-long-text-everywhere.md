---
type: TestReport
title: "試験レポート: 長い場所・ハッシュタグ・名前が、プロフィールの場所と話題と通知から横にはみ出す"
description: "#80 で、場所・話題のタグ・通知の行の長い文字を折り返し、人が入れる全部の欄を長くして全部の画面を 320px で回るテストを足し、どこも横にはみ出さないことを確かめた記録。"
tags: [test-report, layout, overflow, bug]
status: stable
---

# 試験レポート: 長い場所・ハッシュタグ・名前が、プロフィールの場所と話題と通知から横にはみ出す

## 対象

- issue: [#80](https://github.com/ohta-rh/x-modoki-v2/issues/80)（バグ。#34 の探索的テストの 3 巡目で見つけた）
- commit: `2a3750f`（ブランチ `m1/local-app`、PR #40）
- CI: [実行 44506138255](https://github.com/ohta-rh/x-modoki-v2/actions/runs/44506138255)（成功）
- 日付: 2026-11-19

## 環境

- macOS 26.2、Google Chrome（拡張から操作、と Playwright 1.65.0 の `channel: 'chrome'`）、Node.js 26.12.0（`.nvmrc` は 24。CI の実行を本当の結果とする）、Docker Compose の PostgreSQL
- 動かし方: `pnpm build && pnpm start -p 3001`。Chrome の確認用の架空の人（`chrome_check18`、テーマ dim）と、確かめるために登録した架空の人（`hand_n93d5q`、ライト）

## 判定

合格 — 受け入れ条件 3 件のうち 3 件を満たした。

## 受け入れ条件ごとの結果

| # | 条件 | 確かめ方 | 結果 | エビデンス |
|---|---|---|---|---|
| 1 | 場所・話題のタグ・通知の行は、長い文字でも 320px で横にはみ出さない | `e2e/narrow.spec.ts` › 人が入れる全部の欄が長くても…（#80）、`profile-header.test.tsx`・`trends.test.tsx`・`notification-list.test.tsx` | 合格 | テストの名前のとおり |
| 2 | 人が入れる全ての欄を長くした人について、全部の画面を 320px で回る 1 つのテスト | 同上（#31 の全部の画面と、相手のフォロワー・通知・話題） | 合格 | テストの名前のとおり |
| 3 | CI が緑で、カバレッジが 100% のまま | CI の実行 | 合格 | CI の実行 |

## 自動のテスト

`PORT=3300 pnpm verify` が 0 で終わった。#80・#81 だけの `2a3750f` で単体のテスト 1049 本・画面のテスト 351 本、#82 を足した `8396eca` で単体のテスト 185 ファイル 1082 本・画面のテスト 357 本（Chromium・Firefox・WebKit）、カバレッジは 4 つとも 100%。CI でも同じ 7 つが通った。

- 手元の WebKit（ADR-0052 の Docker の中の WebKit）が、ほかのブラウザと並べて流したときにだけ、登録やダイアログで 30 秒の時間切れになることが今日 2 回あった。WebKit だけで流し直すと全部通る。原因は分からない。CI では起きていない

### TDD の記録

| # | 振る舞い | 先に書いたテスト | 赤（落ちた理由） | 緑にした実装 |
|---|---|---|---|---|
| 1 | 全部の画面ではみ出さない（受け入れのテスト） | `e2e/narrow.spec.ts` › 人が入れる全部の欄が長くても… | `{"/e2e_…": 466, "/e2e_…/with_replies": 466, "/explore": 947, "/notifications": 770}`。最初は `networkidle` を待って時間切れ、本文が 280 の重みを超えて投稿できず、場所の「L」では幅が足りず赤にならなかったので、3 つともテストを直した（テストの誤り） | 下の全部 |
| 2 | 場所を折り返す | `profile-header.test.tsx` | `expect(element).toHaveClass("min-w-0 break-all")` | `profile-header.tsx` |
| 3 | 話題のタグを折り返す | `trends.test.tsx` | `expect(element).toHaveClass("break-all")` | `trends.tsx` |
| 4 | 通知の行を折り返す | `notification-list.test.tsx` | `expect(element).toHaveClass("break-words")` | `notification-list.tsx` |

## コードレビュー

- 判定: APPROVE（#80・#81 は 4 回目、#82 は 5 回目）　範囲: 1〜3 回目は #80〜#82 をまとめて `origin/m1/local-app...8e90d5e`・`…da59258`・`…33448dd`。3 回で通らなかったので、決まり（`.claude/rules/code-review.md` の 7）どおり、push していない変更を #80・#81（`2a3750f`）と #82（`1b8a8d2`）に分け、それぞれ新しい reviewer に出した　レビューした sub agent: code-reviewer（opus）

| # | 回 | 重さ | 指摘 | 確かめた結果 | 対応 |
|---|---|---|---|---|---|
| 1 | 1 | blocker | ログアウトが成功しても、Next.js が `redirect` で Promise を拒むので、`.catch` が通信のトーストを出す | 再現した（オンラインのログアウトでトースト。単体のテストが赤） | 直した（`da59258`）。`unstable_rethrow` で移動の誤りを投げ直す |
| 2 | 1 | blocker | 登録とログインの成功でも `settle` が redirect を失敗にし、隠れた画面に通信の文言が残る | 再現した（成功のあと「戻る」で文言。e2e が赤 `Expected: 0 Received: 1`） | 直した（`da59258`）。`settle` が Next.js の制御の誤りを投げ直す |
| 3 | 2 | major | 通知の既読の `markRead` が名前の決まりから外れ、失敗を受けていない（ルールが見えない） | 再現した（拒まれると捕まえていない拒否） | 直した（`33448dd`）。`markReadAction` にし、`settle` で受ける |
| 4 | 2 | minor | #80 の全部の画面を回るテストが、#31 の画面の半分を回っていない | 正しい | 直した（`33448dd`）。#31 と同じ画面を全部回る |
| 5 | 3 | major | ルールが、矢印関数の本体や `return` を全部許すので、`onClick={() => signOut()}` を見逃す | 再現した（ルールのテストが赤 3 本） | 直した（#82 の `1b8a8d2`）。名前が action の関数で返すときだけ許す |
| 6 | 4（#80・#81） | — | 指摘なし（APPROVE） | — | — |
| 7 | 5（#82） | minor | JSX の子の矢印関数で、ルールが報告せずに落ちる | 再現した（`TypeError: Cannot read properties of undefined (reading 'name')`） | 直した（`8396eca`）。テストを足した |

## ブラウザでの確認

| URL | 幅 | テーマ | した操作 | 見えた結果 | 画面の写真 |
|---|---|---|---|---|---|
| `/hand_n93d5q（直す前）` | 320 | ライト | 場所を W の 30 字にした | 146px はみ出す | `before-location-320.jpg` |
| `/explore（直す前）` | 320 | ライト | 100 字のハッシュタグ | 627px はみ出す | `before-trends-320.jpg` |
| `/notifications（直す前）` | 320 | ライト | 長い名前の人にフォローされた | 281px はみ出す | `before-notifications-320.jpg` |
| `/hand_n93d5q` | 320 | ライト | 同じ | はみ出さない（0） | `after-location-320.jpg` |
| `/explore` | 320 | ライト | 同じ | タグが折り返す（0） | `after-trends-320.jpg` |
| `/notifications` | 320 | ライト | 同じ | 名前が折り返す（0） | `after-notifications-320.jpg` |
| `/hand_n93d5q` | 1280 | ライト | 開いた | 収まる | `80-profile-1280.jpg` |
| `/hand_n93d5q` | 768 | ライト | 開いた | 収まる | `80-profile-768.jpg` |
| `/explore` | 1280 | ライト | 開いた | 右の列の中に収まる | `80-explore-1280.jpg` |
| `/explore` | 768 | ライト | 開いた | 収まる | `80-explore-768.jpg` |

- コンソール: エラー 0、警告 0　通信: 失敗 0（`chrome-evidence.mjs` の読み込みと、Playwright の Chrome での操作。わざと通信を切った間の失敗と、壊れた URL の 404 は除く）
- 1400px の写真は、拡張から操作した Chrome の窓の幅

![/hand_n93d5q（直す前）（320px）](evidence/issue-0080-long-text-everywhere/before-location-320.jpg)
![/explore（直す前）（320px）](evidence/issue-0080-long-text-everywhere/before-trends-320.jpg)
![/notifications（直す前）（320px）](evidence/issue-0080-long-text-everywhere/before-notifications-320.jpg)
![/hand_n93d5q（320px）](evidence/issue-0080-long-text-everywhere/after-location-320.jpg)
![/explore（320px）](evidence/issue-0080-long-text-everywhere/after-trends-320.jpg)
![/notifications（320px）](evidence/issue-0080-long-text-everywhere/after-notifications-320.jpg)
![/hand_n93d5q（1280px）](evidence/issue-0080-long-text-everywhere/80-profile-1280.jpg)
![/hand_n93d5q（768px）](evidence/issue-0080-long-text-everywhere/80-profile-768.jpg)
![/explore（1280px）](evidence/issue-0080-long-text-everywhere/80-explore-1280.jpg)
![/explore（768px）](evidence/issue-0080-long-text-everywhere/80-explore-768.jpg)

## 見つけた問題

なし
