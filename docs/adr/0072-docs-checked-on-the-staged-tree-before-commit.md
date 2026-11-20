---
type: ADR
title: "ADR-0072: commit の前に、ステージした木でドキュメントの確認を動かす"
description: "作業中のファイルでは通るのに commit した木で CI が落ちることと、落ちた確認のあとに commit することが繰り返したので、git の pre-commit フックで、ステージした木を書き出してドキュメントと要件の結びつきの確認を動かし、setup-local.sh でフックを有効にする。"
tags: [process, docs, quality]
status: stable
---

# ADR-0072: commit の前に、ステージした木でドキュメントの確認を動かす

- ステータス: 採用
- 日付: 2026-11-20
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: #39、ADR-0001、ADR-0002、ADR-0053、ADR-0070、[振り返り](../research/retrospective-m1.md)

## 背景

- マイルストーン 1 で、`node scripts/check-docs.mjs` が作業中のファイルでは通るのに、commit した木では CI の最初の確認で落ちることが 2 回あった（`c61f57f` の実行 44274742145、`6c382f4` の実行 44356866632）。ルール（「commit するものを確かめる」）を足したあとも、手で `git stash --keep-index` を流す決まりのままだった
- 確認と commit を `;` でつないで、落ちた確認のあとに commit したことが 3 回あった（`9ca1b92`、`93f83a7`、`413225f`）
- ドキュメントの確認は 0.1 秒で終わる（2026-11-20 に測った）

## 決定

- `.githooks/pre-commit` が `node scripts/check-staged.mjs` を動かす。これは `git checkout-index --all` でステージした木を一時のディレクトリに書き出し、ドキュメントの確認（`check-docs`）と要件の結びつき（`check-traceability`）を動かし、書き出した木を消す。1 つでも落ちたら commit しない
- `scripts/setup-local.sh` が `git config core.hooksPath .githooks` でフックを有効にする（手順書の最初の準備で必ず流す）
- 重い確認（型・lint・テスト・ビルド・画面のテスト）はフックに入れない。push の前の `pnpm verify` と CI のまま
- フックを飛ばす（`--no-verify`）ことは、ほかの確認と同じく禁じる

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| **pre-commit でドキュメントだけ（採用）** | 速い（0.1 秒）。ステージした木を見るので、作業中のファイルとのずれが無い | `pnpm verify` が落ちたあとの commit は止めない |
| pre-commit で `pnpm verify` 全部 | 落ちた確認のあとの commit を全部止める | 1 回 10 分。commit のたびには重すぎる |
| Claude Code のフックで `; git commit` を止める | エージェントの間違いを止める | 人の commit には効かない。ハーネスの設定はリポジトリの外で、確かめられない |
| ルールのまま | 何も足さない | 2 回と 3 回、ルールがあっても起きた |

## 結果

- 良くなること: 壊れたドキュメントや要件の結びつきが commit に入らない
- 受け入れる負担: commit のたびに 1 秒ほど。リポジトリの git の設定（`core.hooksPath`）を、手順書の準備で変える
- 守ること: フックを飛ばさない。ドキュメントの確認を足したら、フックでも動く（同じスクリプトを呼ぶ）
