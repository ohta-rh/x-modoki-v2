---
type: TestReport
title: "試験レポート: 画像を 5 枚選んだときの「4 枚まで」の知らせが、ファイルの無い選択で消える"
description: "#54 で、画像の添付の add がファイルの無い選択で「画像は 4 枚までです」を消す不具合を、何もせずに戻るようにして直し、単体のテストと本物の Chrome で確かめた記録。"
tags: [test-report, media, bug]
status: stable
---

# 試験レポート: 画像を 5 枚選んだときの「4 枚まで」の知らせが、ファイルの無い選択で消える

## 対象

- issue: [#54](https://github.com/ohta-rh/x-modoki-v2/issues/54)（バグ。#26 の `pnpm verify` で、Firefox の画面のテストが全部を流したときだけ落ちて見つけた）
- commit: `cc80090`（ブランチ `m1/local-app`、PR #40）
- CI: [実行 44318259189](https://github.com/ohta-rh/x-modoki-v2/actions/runs/44318259189)
- 日付: 2026-11-18

## 環境

- macOS 26.2、Node.js 26.12.0（`.nvmrc` は 24。CI の実行を本当の結果とする）、Docker Compose の PostgreSQL と Garage、Playwright 1.65.0
- 動かし方: `pnpm build && pnpm start -p 3300`、インストールした Chrome を Playwright で動かす台本（画像を選ぶため）

## 判定

合格 — 受け入れ条件 2 件のうち 2 件を満たした。

## 受け入れ条件ごとの結果

| # | 条件 | 確かめ方 | 結果 | エビデンス |
|---|---|---|---|---|
| 1 | ファイルの無い選択では、画像も知らせも変わらない | `image-attachments.test.tsx` › ファイルの無い選択は…（#54） | 合格 | — |
| 2 | CI が緑、カバレッジ 100% のまま | CI の実行 | 合格 | CI の実行 |

## 自動のテスト

`pnpm verify` が 0 で終わった（単体のテスト 714 本、カバレッジ 4 つとも 100%、画面のテスト 174 本）。

### TDD の記録

| # | 振る舞い | 先に書いたテスト | 赤（落ちた理由） | 緑にした実装 |
|---|---|---|---|---|
| 1 | ファイルの無い選択は何も変えない | `image-attachments.test.tsx` › ファイルの無い選択は…（#54） | `Unable to find an element with the text: 画像は 4 枚までです`（`add([])` のあと） | `image-attachments.tsx`（ファイルが 0 個なら戻る） |

## コードレビュー

- 判定: APPROVE（1 回目）　範囲: `cc80090~1..cc80090`　レビューした sub agent: code-reviewer（opus）

| # | 重さ | 指摘 | 確かめた結果 | 対応 |
|---|---|---|---|---|
| — | — | 指摘なし | — | — |

## ブラウザでの確認

| URL | 幅 | テーマ | した操作 | 見えた結果 | 画面の写真 |
|---|---|---|---|---|---|
| `/home?tab=following` | 1280 / 768 / 375 | ライト | 2 枚を選び、プレビューが出てから 3 枚を選んだ | 4 枚で止まり「画像は 4 枚までです」が残る。送り終えると「ポストする」が押せる | `compose-five-images-*.jpg` |

- コンソール: エラー 0、警告 0　通信: 失敗 0（台本の読み込み）

![5 枚目は選べない（1280px）](evidence/issue-0054-four-image-message/compose-five-images-1280.jpg)
![5 枚目は選べない（768px）](evidence/issue-0054-four-image-message/compose-five-images-768.jpg)
![5 枚目は選べない（375px）](evidence/issue-0054-four-image-message/compose-five-images-375.jpg)

## 見つけた問題

1. **根本原因:** `add` はファイルが 0 個でも `setError(0 > 残り ? … : null)` を実行し、知らせを消していた。単体のテストで再現した
2. **確かめられていないこと:** 画面のテストが落ちた経路（ハイドレーションの前に選んだファイルをマウントで取り込み、入力欄を空にしたあとで、空の `change` が届いた）は推測。Firefox だけで 44 回流しても起きず、全部を流したときだけ起きた。直したあとの `pnpm verify` では起きていない。再び起きたら、トレースを残して経路を調べる
