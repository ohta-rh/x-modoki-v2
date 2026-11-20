---
type: ADR
title: "ADR-0055: 画面のアクセシビリティの検査（axe）は、Chromium と WebKit で流し、Firefox では流さない"
description: "Firefox は axe を流すと、ほかのブラウザと並んだときにページのプロセスが signal 11 で落ち、手元の macOS でも CI と同じ Linux のイメージでも再現したので、e2e/a11y.spec.ts は Chromium と WebKit で流し、Firefox は残りの全部の画面のテストを今まで通り流す。"
tags: [accessibility, testing, playwright, firefox]
status: stable
---

# ADR-0055: 画面のアクセシビリティの検査（axe）は、Chromium と WebKit で流し、Firefox では流さない

- ステータス: 採用
- 日付: 2026-11-19
- 決定者: ユーザー（エージェントが Firefox の設定で外そうとしたところ、自動の安全の判定に「確認を弱める」として止められた。そこでユーザーに聞き、ユーザーが選んだ）
- 関連: [ADR-0024](0024-definition-of-done-requires-browser-testing.md)、[ADR-0046](0046-ci-browser-tests-in-the-official-playwright-image.md)、[ADR-0052](0052-local-webkit-in-the-playwright-image.md)、#31

## 背景

- #31 で `@axe-core/playwright` 4.14.0 を足し、`e2e/a11y.spec.ts` で 3 つのテーマの全部の画面を調べた（2026-11-19）
- Firefox だけが、axe の途中で `frame.evaluate: Page crashed` で落ちた。`DEBUG=pw:browser` の記録には、ページのプロセスの `exited on signal 11` が残った
- 落ちる画面は毎回違った。分けて試した結果:
  - Firefox だけを 1 つずつ流す: 9 本とも通った
  - Firefox だけを並べる: 落ちた
  - `color-contrast` を外して Firefox だけを並べる: 9 本とも通った
  - `color-contrast` を外して 3 つのブラウザを並べる: 落ちた
  - 長いスクリプトを止める見張りを切る（`dom.ipc.reportProcessHangs`、`dom.max_script_run_time`）: 減ったが残った
  - axe の結果をまとめる新しいページを開かない形（`setLegacyMode`）: 残った
  - アバターの変更を戻す: 残った
- CI と同じ `mcr.microsoft.com/playwright:v1.65.0-noble` の Linux の Firefox でも、同じく落ちた
- Chromium と WebKit は、3 つのテーマで続けて流しても落ちず、違反 0 だった

## 決定

- **`playwright.config.ts` の firefox の project に `testIgnore: /a11y\.spec\.ts$/` を置く。** axe の spec は Chromium と WebKit で流す
- Firefox は、ほかの全部の画面のテストを今まで通り流す。そこには、キーボードだけの操作（`e2e/keyboard-only.spec.ts`）とモーダル（`e2e/modals.spec.ts`）と 360px（`e2e/narrow.spec.ts`）も入る
- 色の差は、ブラウザに関係なく、`src/_app/styles/tokens.test.ts` が全部の組み合わせで計算する（ADR-0054）

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| **Firefox では axe を流さない（採用、ユーザーが選んだ）** | 落ちない。axe が読む DOM と CSS は、Chromium と WebKit で確かめる | Firefox だけの描画の違いは axe では見ない |
| Firefox の axe を、別の実行で 1 つずつ流す | 3 つのブラウザで axe が残る | e2e が 3 分ほど延び、`pnpm test:e2e` と CI の手順が二段になる |
| Firefox だけ `color-contrast` を外す | 残りの規則は Firefox でも流れる | 3 つのブラウザを並べると、それでも落ちた |
| 落ちたら流し直す（retries） | 設定が少ない | 決まり（retries 0）に反し、ほかの揺れも隠す |

## 結果

- 良くなること: `pnpm verify` と CI が、Firefox のプロセスの落ち方に左右されない
- 受け入れる負担: axe の結果は Chromium と WebKit の 2 つ分。Firefox で axe を流すには、Firefox の版を上げたときに、この ADR の確かめ方で落ちないことを確かめ直す
- 守ること: Firefox から外すのは `a11y.spec.ts` だけ。ほかの spec を同じ形で外さない
