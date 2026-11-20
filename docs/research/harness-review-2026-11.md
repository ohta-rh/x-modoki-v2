---
type: Research
title: "ハーネスの見直し（2026-11）"
description: "Anthropic の Claude Code の公式の資料と、マイルストーン 1 のセッションの記録（時間・費用・CI の待ち）を突き合わせ、決まりの読み込み方・skill・フック・CI の形をどう変えるかの根拠をまとめる。"
tags: [research, harness, process, ci]
status: stable
---

# ハーネスの見直し（2026-11）

## 調査日: 2026-11-20

- 対象: このリポジトリのハーネス（`CLAUDE.md`、`.claude/rules/`、`.claude/agents/`、CI、git のフック）
- 一次資料は code.claude.com の資料（参考リンク）。読んだのは、読むだけの sub agent（claude-code-guide）。数字は資料に書かれたものだけを使った

## 1. このセッションで分かったこと（数字）

| 項目 | 値 | 出典 |
|---|---|---|
| 始めから終わりまで | 約 48 時間（2026-11-18 08:37 〜 11-20 08:20） | セッションの記録の時刻 |
| 費用（API の料金に直した値） | 約 $830〜$900。うち Opus 5.5 が約 $818、キャッシュの読み出しが約 $560 | セッションと sub agent の記録のトークン数 × 料金の表（2026-11-03） |
| CI の実行 | 123 回。うち 69 回（56%）は文書だけの commit で、そのための全部の確認に合計 419 分 | `gh run list` と各 commit の変更のファイル |
| 1 回の CI | 終わりのほうで約 20 分（画面のテストが 3 つのブラウザを順に流す） | CI の実行の記録 |
| 毎回読み込む決まり | `CLAUDE.md` と `@` で取り込む 9 つのルール、合わせて約 78KB。sub agent も同じものを読む | `wc -c` |

## 2. 公式の資料が言うこと

- `CLAUDE.md` は 1 ファイル 200 行未満を目安にする。長いと文脈を使い、守られにくくなる。`@` の取り込みは、起動のときに読み込まれ、文脈の量を減らさない。
- `.claude/rules/` は自動で読み込まれる。`paths:` の無いルールは起動のときに読まれ、`paths:` のあるルールは、合うファイルを開いたときにだけ読まれる。
- skill は、名前と説明だけが常に文脈にあり、本文は呼ばれたときに読み込まれる。1 回だけ要る手順や参照の資料は skill に置く。本文は 500 行未満にし、詳しいことは参照のファイルに分ける。
- `CLAUDE.md`・プロンプト・skill は「指針」で、Claude が当てはまらないと判断することがある。フック・deny のルール・サンドボックスは「強制」される。曲げられない決まりはフックか deny にする。強制する数は少なく保つ。
- 強調（IMPORTANT、すべて大文字）を重ねると、決まりを守りすぎる。行が見落とされるなら、ファイルを短くする。
- フックは、終了コード 2 で止め、標準エラーの理由が Claude に届く。終了コード 1 は止めない。
- 読むだけのレビュアーは `tools` で書き換えを封じ、「正しさに関わる穴だけを報告し、好みは飛ばす」と頼む。
- sub agent は、並べる作業・量の多い出力・独立したレビューに使う。文脈を守るためだけには使わない（1 つごとにトークンと時間がかかる）。

## 3. 突き合わせ

| 見つけたこと | 公式の資料 | 変えること |
|---|---|---|
| 毎回 78KB の決まりを読み込み、sub agent も同じものを読む | 200 行未満、`@` は量を減らさない、`paths:` で必要なときだけ | `CLAUDE.md` を要点と道しるべだけにし、コードと文書の決まりに `paths:` を付け、PBI の手順は skill に移す（ADR-0074） |
| 書いた決まりがあっても、`;` でつないだ commit（3 回）、作業中の木での文書の確かめ（2 回）が繰り返した | 曲げられない決まりはフックに | Bash のフック（`scripts/guard-bash.mjs`）、編集のフック（`format-edited.mjs`）、commit の前のフック（ADR-0072）。決まりの文は短くする |
| CI の 56% が文書だけで、1 回 20 分 | — | 文書だけなら軽い確認、それ以外は画面のテストをブラウザごとのジョブで同時に（ADR-0073） |
| PBI ごとに、作業の前の `pnpm verify`（約 10 分）を流していた | 検証は、実行するコマンドとその出力で示す | 出発点の commit の CI が緑であることを基準にする（ADR-0074） |
| CI を待つ間、何もしていない時間が長い | — | 待つ間は、次の PBI を読むことと試験レポートを書くことだけをしてよい。コードは書かず、push しない（ADR-0074） |
| レビュアーが毎回、手元の `pnpm` が動かないことを報告していた | — | レビュアーの定義に、`./node_modules/.bin` を直接呼ぶ逃げ道を書く |

## 4. 変えないこと

- 確認の中身（8 つの確認、カバレッジ 100%、3 つのブラウザ、本物の Chrome、独立したレビュー）は変えない。品質を先にするため
- 主のモデル（Opus 5.5）は変えない。費用の大きな部分はキャッシュの読み出しで、モデルを下げても文脈の量は減らない。文脈を小さくする（決まりの量を減らす）ほうが効く

## 参考リンク

- [Claude Code: memory（CLAUDE.md、rules、paths）](https://code.claude.com/docs/en/memory.md)
- [Claude Code: best practices](https://code.claude.com/docs/en/best-practices.md)
- [Claude Code: skills](https://code.claude.com/docs/en/skills.md)
- [Claude Code: hooks](https://code.claude.com/docs/en/hooks.md)
- [Claude Code: sub-agents](https://code.claude.com/docs/en/sub-agents.md)
- [Claude Code: features overview](https://code.claude.com/docs/en/features-overview.md)
- [Claude Code: permissions](https://code.claude.com/docs/en/permissions.md)
