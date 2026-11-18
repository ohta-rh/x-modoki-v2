---
type: ADR
title: "ADR-0047: CI でブラウザを立ち上げる確認は、どれも公式の Playwright のイメージの中で動かす"
description: "5 番目の確認（Vitest）の中にも Chromium を立ち上げるスクリプトのテストがあり、7 番目だけをイメージに入れると 5 番目が落ちたので、ブラウザを立ち上げる 5 番目と 7 番目の両方をイメージの中で動かす。"
tags: [ci, playwright, testing]
status: stable
---

# ADR-0047: CI でブラウザを立ち上げる確認は、どれも公式の Playwright のイメージの中で動かす

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: [ADR-0046](0046-ci-browser-tests-in-the-official-playwright-image.md)（「7 番目だけ」をこの ADR で置き換え）、#52

## 背景

- ADR-0046 は、7 番目の確認（画面のテスト）だけを公式の Playwright のイメージの中で動かし、ランナーからブラウザを入れるステップを無くした
- その最初の CI の実行（[44313785881](https://github.com/ohta-rh/x-modoki-v2/actions/runs/44313785881)）で、5 番目の確認（`pnpm test --coverage`）が `browserType.launch: Executable doesn't exist at /home/runner/.cache/ms-playwright/chromium_headless_shell-1254/…` で落ちた。`scripts/chrome-evidence.test.mjs` は、画面の写真の台本を本物の Chromium で確かめる
- ほかの確認（1〜4・6）はブラウザを立ち上げない

## 決定

- **ブラウザを立ち上げる確認（今は 5 番目と 7 番目）は、どれも同じイメージの中で、ADR-0046 と同じ形（ランナーの利用者・ネットワーク・Node.js と pnpm）で動かす。**
- ランナーにブラウザは入れない。ブラウザを立ち上げるテストを新しく置く確認があれば、その確認もイメージの中で動かす
- ほかは ADR-0046 のまま

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
|---|---|---|
| **ブラウザを立ち上げる確認をイメージの中で（採用）** | ランナーにブラウザを入れない。5 番目のデータベースと Garage にも `localhost` で届く | `docker run` の引数が 2 か所に並ぶ |
| 5 番目のためにランナーに Chromium を入れる | 5 番目の形は変わらない | apt のミラーに頼る準備が戻る（ADR-0046 の理由そのもの） |
| `chrome-evidence.test.mjs` を 5 番目から外す | 簡単 | スクリプトのテストを外すのは確認を弱めること（`.claude/rules/quality-gates.md`） |

## 結果

- 良くなること: CI のどの確認も、ブラウザの準備で apt に触れない
- 受け入れる負担: 同じ `docker run` の形を 2 か所で保つ
- 守ること: イメージの版を変えるときは、2 か所とも同じ変更で変える
