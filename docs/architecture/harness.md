---
type: Architecture
title: "ハーネスの全体像"
description: "エージェントが要件から運用まで 1 件ずつ進めるための、決まり・ループ・関所・記録の 4 つの層と、PBI ごとの 1 周、関所の順番、完了の定義、間違いから生まれた決まりを示す。"
tags: [architecture, process, harness]
status: stable
---

# ハーネスの全体像

- 図解（ブラウザで開く）: [harness.html](harness.html)
- 決定: [ADR-0023](../adr/0023-delivery-loop-one-pbi-at-a-time.md)（1 件ずつ閉じるまでのループ）、[ADR-0024](../adr/0024-definition-of-done-requires-browser-testing.md)〜[ADR-0027](../adr/0027-independent-code-review-in-the-loop.md)（完了の定義・試験レポート・TDD・独立したレビュー）、[ADR-0028](../adr/0028-bugs-are-fixed-to-completion-without-asking.md)・[ADR-0056](../adr/0056-bugs-fixed-inside-the-pbi-and-lighter-local-checks.md)（バグの扱い）、[ADR-0072](../adr/0072-docs-checked-on-the-staged-tree-before-commit.md)（commit の前のフック）、[ADR-0073](../adr/0073-ci-scope-docs-only-and-e2e-per-browser.md)（CI の範囲とブラウザごとのジョブ）、[ADR-0074](../adr/0074-harness-short-claude-md-path-scoped-rules-skills-and-hooks.md)（短い CLAUDE.md・触ったときだけ読む決まり・skill・フック）
- 2026-11-20 の時点（ブランチ `m1/local-app`）

## 1. 4 つの層

```mermaid
flowchart TD
  rules["決まり<br/>短い CLAUDE.md と、触ったときだけ読む 4 つのルール"] --> loop["ループ<br/>skill: deliver-pbi（PBI を 1 件ずつ）と file-issues"]
  loop --> gates["関所<br/>Claude Code のフック → commit の前のフック → pnpm verify → GitHub Actions"]
  gates --> records["記録<br/>ADR・試験レポート・issue のコメント"]
  records -->|"振り返り"| rules
```

| 層 | 中身 | 置き場所 |
|---|---|---|
| 決まり | 毎回読むのは `CLAUDE.md`（要点と道しるべ）だけ。構造（FSD）・品質・TDD・文書の決まりは、合うファイルを開いたときに読まれる（`paths:`） | `CLAUDE.md`、`.claude/rules/` |
| ループ | PBI を EPIC の順に 1 件ずつ、閉じるまで（完了の定義・レビュー・バグの扱いは skill の参照のファイル）。issue の書き方。独立した code-reviewer（opus） | `.claude/skills/deliver-pbi/`、`.claude/skills/file-issues/`、`.claude/agents/code-reviewer.md` |
| 関所 | Claude Code のフック（Bash の前・編集のあと）、commit の前のフック、`pnpm verify` の 7 つ、CI（範囲の判定・8 つ・まっさらな clone）、自前の lint とスクリプト | `.claude/settings.json`、`.githooks/`、`package.json`、`.github/workflows/ci.yml`、`eslint-rules/`、`scripts/` |
| 記録 | 決定、試験レポート（写真つき）、issue を閉じるときの根拠 | `docs/adr/`、`docs/test-reports/`、GitHub の issue |

## 2. 関所の順番

| いつ | 関所 | 確かめること | かかる時間 |
|---|---|---|---|
| コマンドのたび | `scripts/guard-bash.mjs`（Bash の前） | 全部をまとめたステージ、確認を飛ばす commit、`;`・`||`・改行のあとの commit と push、名前でのプロセスの停止 | 一瞬 |
| 編集のたび | `scripts/format-edited.mjs`（編集のあと） | 編集したファイルを Prettier で整える（止めない） | 約 1 秒 |
| commit のとき | `.githooks/pre-commit` | ステージした木で、ドキュメントの形とリンク、要件とテストの結びつき、引いた ADR の番号 | 約 1 秒 |
| push の前 | `pnpm verify` | 型・ESLint・Steiger・整形・単体とデータアクセス層（カバレッジ 100%）・ビルド・3 ブラウザの e2e | 約 10 分 |
| push の前 | 人の代わりの目 | 本物の Chrome（3 つの幅と 640×400）、独立した code-reviewer | 数分〜 |
| push の後 | GitHub Actions | 文書だけなら文書と整形。それ以外は依存の監査と上の 7 つ（画面のテストはブラウザごとに同時）。`fresh-clone` で手順書をそのまま流す | 文書だけ: 数分、それ以外: 約 6 分（2026-11-20 の実行 44656010115。前は約 20 分） |

## 3. エージェントが決めないこと

アカウント・支払い・秘密の値、強制の push、作っていない物を消すこと、確認を弱めること、マージとリリースの公開は、ユーザーのもの。それ以外の判断はエージェントが決め、ADR に残す（[ADR-0028](../adr/0028-bugs-are-fixed-to-completion-without-asking.md)、[ADR-0029](../adr/0029-milestone-on-a-branch-when-a-pr-is-requested.md)）。

PBI ごとの 1 周の 12 の手順、完了の定義の 10 項目、間違いから生まれた決まりの表は、[図解](harness.html) にある。
