---
type: ADR
title: "ADR-0046: CI の画面のテストは、公式の Playwright のイメージの中で、ランナーの Node.js で動かす"
description: "ブラウザの依存のパッケージを毎回 apt で入れると、ミラーが遅い日に CI が止まるので、7 番目の確認だけを @playwright/test と同じ版の公式のイメージの中で動かし、Node.js と pnpm は .nvmrc の版のランナーのものを読み込む。"
tags: [ci, playwright, testing]
status: stable
---

# ADR-0046: CI の画面のテストは、公式の Playwright のイメージの中で、ランナーの Node.js で動かす

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: ユーザー（方向: 「CI は Playwright のイメージを使えばいいのでは」）、エージェント（形の細部）
- 関連: [ADR-0020](0020-ci-required-github-actions.md)（CI は必須）、ADR-0024（3 つのブラウザ）、#43・#44・#45・#52

## 背景

- CI はブラウザが要るシステムのパッケージを毎回 apt で入れていた。ミラーが遅い日に何分も止まり、#43（再試行）、#44（root の打ち切り）、#45（`.deb` のキャッシュ）と 3 回手当てしても、準備の時間と成否がミラー次第のままだった
- 公式のイメージ `mcr.microsoft.com/playwright:v1.65.0-noble` には、`@playwright/test` 1.65.0 が求める版のブラウザ（chromium 1254・firefox 1572・webkit 2388）と依存のパッケージが入っている。中の Node.js は v26.13.1 で、`.nvmrc` の 24 と違う（どれも 2026-11-18 に pull して確かめた）
- PostgreSQL と Garage は、ランナーの上で Docker Compose で立てている（`scripts/setup-local.sh`）

## 決定

- **7 番目の確認（画面のテスト）だけを、`@playwright/test` と同じ版の公式のイメージの中で動かす。** apt・ブラウザのキャッシュ・`playwright install` のステップは無くす
- **ジョブはランナーの上のまま**にし、`docker run --network host --ipc=host` で動かす。データベースと Garage には `localhost` で届く
- **Node.js と pnpm はランナーのものを使う**（`.nvmrc` の版）。ランナーのホームとツールのキャッシュを同じパスで読み込み、`PATH` を渡す
- `@playwright/test` の版を上げるときは、同じ変更でイメージの版も上げる

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
|---|---|---|
| **7 番目だけをイメージの中で（採用）** | apt に触れない。ほかの確認とサービスは今のまま | `docker run` の引数が長い。ランナーとイメージの OS が同じ系統であることに頼る |
| ジョブ全体を `container:` で動かす | 書き方が素直 | Docker Compose のサービスに届かない。GitHub の `services:` に移すと、Garage の設定を作る手順が CI だけ別になる |
| 今のまま（apt と `.deb` のキャッシュ） | 変えない | ミラーが遅い日に止まり続ける |
| イメージの Node.js（26）で動かす | 引数が短い | `.nvmrc` と違う版で確かめることになる（`.claude/rules/quality-gates.md`） |

## 結果

- 良くなること: 画面のテストの準備が、イメージの取得（MCR）だけになる
- 受け入れる負担: 毎回イメージを取得する。Playwright の版とイメージの版を一緒に上げる
- 守ること: イメージの版は `@playwright/test` の版と同じ。Node.js はイメージのものを使わない
