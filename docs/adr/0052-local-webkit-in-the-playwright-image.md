---
type: ADR
title: "ADR-0052: macOS の手元では、画面のテストの WebKit を CI と同じ Playwright のイメージで動かす"
description: "macOS では同時に動くヘッドレスの WebKit に requestAnimationFrame が来なくなり手元の e2e だけが落ちるので、WebKit は docker compose の webkit サービス（CI と同じ公式の Playwright のイメージの run-server）につないで動かす。"
tags: [testing, playwright, webkit, tooling]
status: stable
---

# ADR-0052: macOS の手元では、画面のテストの WebKit を CI と同じ Playwright のイメージで動かす

- ステータス: 採用
- 日付: 2026-11-19
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: [ADR-0046](0046-ci-browser-tests-in-the-official-playwright-image.md)（CI の画面のテストは公式の Playwright のイメージで）、ADR-0024、#61、#60

## 背景

- 2026-11-19 の計測（#61、macOS、Playwright 1.65.0）。`/home` をアプリのスクリプトを止めて開き、`requestAnimationFrame` が 1 秒以内に来るかを数えた
  - ヘッドレスの WebKit を同時に 1・2 個: 止まらない
  - 4 個: 2 個で止まる
  - 8 個: 8 個とも止まる（画面に出す形でも 2 個）
- React は、隠して流した塊を `requestAnimationFrame` を待って差し込む。だから止まったページでは、記事が `<div hidden>` の中に残り、テストは時間切れになる
- #60 で投稿をサーバーで描くようにしてから、手元の `pnpm verify` は 5 回続けて WebKit のどれかで落ちた
- 同じ spec を同じ 12 並びで、CI と同じ `mcr.microsoft.com/playwright:v1.65.0-noble` の WebKit で流すと、30 本とも通った
- CI は Linux で、もともとこのイメージの中で動いている（ADR-0046）

## 決定

- **`docker-compose.yml` に `webkit` サービスを置く。** CI と同じイメージで、`playwright@<@playwright/test の版> run-server` を `127.0.0.1:3333` で動かす
- **`playwright.config.ts` の webkit は、`process.platform === 'darwin'` のときだけ、そこへつなぐ。** `connectOptions: { wsEndpoint: 'ws://127.0.0.1:3333/', exposeNetwork: '<loopback>' }` を使い、アプリには手元の `localhost` を通して届く
- Linux（CI を含む）と Chromium・Firefox は、今まで通り手元のブラウザで動かす
- イメージの版は `@playwright/test` と CI のイメージと同じにする。`scripts/quality-gates.test.ts` が 3 つの一致を確かめる
- `scripts/setup-local.sh` は、macOS のとき `webkit` も立ち上げる

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| **macOS では WebKit を CI のイメージで動かす（採用）** | 手元と CI が同じ WebKit になる。並びの数を減らさない | Docker のサービスが 1 つ増える（PostgreSQL と Garage で Docker はもう要る）。手元では macOS の WebKit を試さない |
| 手元の並びの数を 2 に減らす | 設定 1 行 | 画面のテストが 3 倍ほど遅くなる。4 並びでも半分が止まった |
| WebKit を画面に出して動かす | Docker が要らない | 8 並びで 2 個はまだ止まる。窓が開いて作業を邪魔する |
| 手元の WebKit の失敗は数えない | 何も変えない | 確認を弱めることになり、決まり（quality-gates）に反する |

## 結果

- 良くなること: 手元の `pnpm verify` が、CI と同じ WebKit で、続けて 0 で終わる（#61 で 2 回続けて確かめた）
- 受け入れる負担: macOS では `docker compose up -d webkit` が要る。動いていなければ、WebKit の最初のテストがつなげずにすぐ落ちる
- 守ること: `@playwright/test` を上げるときは、`docker-compose.yml` と CI のイメージの版も同じ commit で上げる
