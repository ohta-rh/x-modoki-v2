---
type: TestReport
title: "試験レポート: TDD とコードレビューのルール、ドキュメントの確認の作り直し"
description: "TDD と独立したコードレビューをルールと PBI に入れ、その 2 つを自分の変更に当てて `check-docs.mjs` を直した記録。"
tags: [test-report, harness, tdd, code-review]
status: stable
---

# 試験レポート: TDD とコードレビューのルール、ドキュメントの確認の作り直し

## 対象

- issue: [#1](https://github.com/ohta-rh/x-modoki-v2/issues/1) と PBI #8〜#39 の本文（PBI に結びつかない作業）
- commit: `291ff04`（TDD のルール）、`af8fea9`・`f5a4aaf`・`b167195`（コードレビューと `check-docs.mjs` の修正）、`7f8c57d`（CI の修正）
- CI: [実行 44218477333](https://github.com/ohta-rh/x-modoki-v2/actions/runs/44218477333)（成功）。その前の [実行 44218376384](https://github.com/ohta-rh/x-modoki-v2/actions/runs/44218376384) は失敗（「見つけた問題」の 3）
- 日付: 2026-11-18

## 環境

- OS: macOS 26.2
- ブラウザ: Google Chrome 157.0.8103.79（手での操作は Claude in Chrome の拡張。幅ごとの写真は `scripts/chrome-evidence.mjs`）
- Node.js: 手元は 26.12.0、CI は 24.22.2（`.nvmrc` は 24）。**手元と CI で版が違う**
- 対象: `scripts/check-docs.mjs` と、GitHub の上で表示された issue とルール。アプリのコードはまだ無い

## 判定

合格 — 確かめた条件 8 件のうち 8 件を満たした。途中で `main` の CI を 1 回落とした（1 つの commit の間。「見つけた問題」の 3）。

## 受け入れ条件ごとの結果

| # | 条件 | 確かめ方 | 結果 | エビデンス |
|---|---|---|---|---|
| 1 | TDD のルール（ADR-0026）と、コードレビューのルール（ADR-0027）がリポジトリにあり、`CLAUDE.md` から読まれる | ファイルを読む。Chrome で表示を見る | 合格 | [TDD のルール](evidence/2026-11-18-tdd-and-code-review/chrome-tdd-rule.jpg) |
| 2 | レビューする sub agent の定義があり、モデルが `opus` に固定され、読むだけの道具しか持たない | Chrome で `.claude/agents/code-reviewer.md` を開く | 合格（`model: opus`、`tools: Read, Grep, Glob, Bash`） | [定義](evidence/2026-11-18-tdd-and-code-review/chrome-code-reviewer-agent.jpg) |
| 3 | 完了の定義が 10 項目で、TDD とコードレビューを含む | `.claude/rules/definition-of-done.md` を読む | 合格 | — |
| 4 | 全部の PBI の本文に、完了の定義の 10 項目がある | `gh issue list --label pbi` の本文を数える | 合格（32 / 32） | [#21 の完了の定義](evidence/2026-11-18-tdd-and-code-review/chrome-issue-21-definition-of-done.jpg) |
| 5 | コードを変える PBI の「検証」に、最初に書いて落とすテストが名前で書いてある | 同上 | 合格（23 件。残り 9 件はコードを変えない PBI） | 同上 |
| 6 | `check-docs.mjs` が、ドキュメントのルールの 4 節の「スクリプトが確かめる」項目を全部確かめ、項目ごとに、確かめを外すと落ちるテストがある | `node --test scripts/check-docs.test.mjs`、3 回目のレビューの一覧 | 合格（51 件） | 「自動のテスト」 |
| 7 | 独立したレビューが `APPROVE` を返した | 「コードレビュー」 | 合格（3 回目） | 「コードレビュー」 |
| 8 | CI が、スクリプトのテストとドキュメントの確認を動かして緑 | `gh run watch` | 合格（直したあと） | 上の CI の URL |

## 自動のテスト

```
$ node --test scripts/check-docs.test.mjs
# tests 51
# pass 51
# fail 0

$ node scripts/check-docs.mjs
docs check passed: 47 file(s)
```

CI（Node.js 24.22.2）: 「Tests for the repository scripts: success」「Documentation check: success」。

### TDD の記録

`scripts/check-docs.mjs` への変更。テストは `scripts/check-docs.test.mjs`。

| # | 振る舞い | 先に書いたテスト | 赤（落ちた理由） | 緑にした実装 |
|---|---|---|---|---|
| 1 | 別の場所の束を確かめられる | a valid bundle passes | 26 件中 24 件が失敗。`--root` が無く、実際のリポジトリを見ていた。**期待した理由ではない赤**だったので、`--root` だけを先に入れてやり直した | `--root <dir>` |
| 2 | コードの枠の中だけにある写真を、写真として数えない | a screenshot that only appears inside a code fence does not count | `expected exit 1, got 0` | 写真を `withoutCode(body)` から拾う |
| 3 | 文書があるのに `index.md` が無いディレクトリを落とす | a directory holding documents but no index.md is rejected | `expected exit 1, got 0` | 文書を持つ全部のディレクトリを調べる |
| 4 | ルートの文書と、子のディレクトリの載せ忘れを落とす | a document at the bundle root … / a subdirectory that its parent index does not link … | `expected exit 1, got 0`（2 件） | ルートを除外するのをやめ、子のディレクトリも調べる |
| 5 | `log.md` からリンクされていない ADR を落とす | an ADR that docs/log.md does not link is rejected | `expected exit 1, got 0` | ADR と試験レポートのリンクを `log.md` で探す |
| 6 | 試験レポートの決まり（`stable`・節の順・写真の場所と種類・TDD の記録の位置・名前・コードレビューの節） | 7 件 | `expected exit 1, got 0`（7 件） | 試験レポートの確認を書き直した |
| 7 | frontmatter の、YAML として読めない行を落とす | an unquoted frontmatter value containing ": " is rejected | `expected exit 1, got 0` | 読めない行を集めて落とす |
| 8 | 禁じた 4 つのキー、新しい順でない履歴、2 文の説明、タイトルつきの切れたリンク | 4 件 | `expected exit 1, got 0`（4 件） | それぞれの確認 |
| 9 | コードの枠の中だけにある見出しを、節として数えない | a section heading that only appears inside a code fence does not count / a TDD record that only appears … | `expected exit 1, got 0`（2 件） | 節を `withoutCode(body)` から探す |
| 10 | タイトルつきの画像も写真として調べる。`..` で外へ出るパスを落とす | an image with a title is still checked as evidence / evidence that escapes its directory with ".." is rejected | `expected exit 1, got 0`（2 件） | 画像の正規表現にタイトルを許す。解決したパスで比べる |

赤の合計は 17 件（1 回目のレビューのあと）、2 件（2 回目）、2 件（3 回目）。

**TDD になっていない部分**（正直な記録）:

- 2 回目のレビューで足した 22 件のテストは、すでにあった確認に対するもので、最初から通った。落ちるのを見ていない。確認を外すと落ちることは、3 回目のレビューが項目ごとに突き合わせた
- `check-docs.mjs` の最初の版と `chrome-evidence.mjs` は、TDD のルールができる前に、テスト無しで書いた。`chrome-evidence.mjs` にはまだテストが無い（#15 の受け入れ条件に入れた）
- TDD のルールを入れた commit（`291ff04`）で、`check-docs.mjs` に「TDD の記録が無いレポートを落とす」確認を、テストより先に足した。ルールを書いたその変更でルールを破っている。あとで壊れた写しで落ちることを確かめ、今はテストがある

## コードレビュー

- 判定: `APPROVE`（3 回目）　範囲: `origin/main...HEAD -- scripts/ .github/`　レビューした sub agent: `code-reviewer` の定義に従う opus の sub agent（毎回、新しいもの。渡したのは差分の範囲と、仕様の文書の場所だけ）

| 回 | 判定 | # | 重さ | 指摘 | 確かめた結果 | 対応 |
|---|---|---|---|---|---|---|
| 1 | CHANGES_REQUESTED | 1 | major | コードの枠の中の画像が、必須の写真として数えられる | 再現した | 直した（TDD の記録の 2） |
| 1 | | 2 | major | `index.md` の確認が、`index.md` のあるディレクトリだけで、`docs/` のルートを飛ばす | 再現した | 直した（3・4） |
| 1 | | 3 | major | ルールは `log.md` の更新を「スクリプトが確かめる」と書いているが、確かめていない | 再現した | ADR と試験レポートは確かめるようにし、`log.md` に 11 件を補った。それ以外は、ルールの「手で確かめる」へ移した |
| 1 | | 4 | major | 試験レポートの決まりの多くを確かめていない | 再現した | 直した（6） |
| 1 | | 5 | minor | 手書きの frontmatter の読み取りが、YAML でないものを通す | 再現した | 読めない行を落とし、受け付ける形をスクリプトの先頭に書いた（7） |
| 1 | | 6 | minor | 禁じた 4 つのキーを落とさない | 再現した | 直した（8） |
| 1 | | 7 | minor | 履歴が新しい順か、説明が 1 文かを確かめていない | 再現した | 直した（8） |
| 1 | | 8 | minor | タイトルつきのリンクを調べない | 再現した | 直した（8） |
| 1 | | 9 | minor | ADR-0002 の「機械で確かめる仕組みはまだ無い」が、事実と違ってしまった | 読んで確かめた | 日付つきの追記を足した |
| 2 | CHANGES_REQUESTED | 1 | major | 「スクリプトが確かめる」18 項目に、確認を外すと落ちるテストが無い | テストを読んで確かめた | 22 件のテストを足した |
| 2 | | 2 | minor | 必須の節が、コードの枠の中だけにあっても通る | 再現した | 直した（9） |
| 2 | | 3 | minor | 「先頭に `--root` と書いてある」ことだけを見るテストは、振る舞いを確かめていない | 読んで確かめた | そのテストを消した |
| 3 | APPROVE | 1 | minor | タイトルつきの画像が、写真の確認から漏れる | 再現した | 直した（10） |
| 3 | | 2 | minor | 写真の場所を、解決したパスではなく文字列の先頭で比べている | 再現した | 直した（10） |

退けた指摘は無い。3 回目のレビューは、手元の Node.js 26 でしか動かせず、「CI の Node.js 24 では確かめられなかった」と書いていた。その点が「見つけた問題」の 3 になった。

## ブラウザでの確認

手での操作（Claude in Chrome。ウィンドウの中の幅は 1746 CSS px）:

| URL | した操作 | 見えた結果 | 画面の写真 |
|---|---|---|---|
| `/issues/21` | 開いて、「検証」と「完了の定義」まで進む | 「検証」に、最初に書いて落とすテスト（`e2e/reactions.spec.ts`）。完了の定義はチェックボックス 10 個で、2 つ目が TDD、6 つ目がコードレビュー。注が 4 行。タイトルの重複も、Markdown の記号のままの表示も無い | ![#21 の完了の定義](evidence/2026-11-18-tdd-and-code-review/chrome-issue-21-definition-of-done.jpg) |
| `/blob/main/.claude/rules/tdd.md` | 開いて読む | 見出し 5 つ、表 1 つ。記録の例のコードの枠は、枠の中で横にスクロールする | ![TDD のルール](evidence/2026-11-18-tdd-and-code-review/chrome-tdd-rule.jpg) |
| `/blob/main/.claude/agents/code-reviewer.md` | 開いて読む | frontmatter が表で出て、`model` が `opus`、`tools` が 4 つ。見出し 6 つ | ![レビューする sub agent の定義](evidence/2026-11-18-tdd-and-code-review/chrome-code-reviewer-agent.jpg) |

幅ごとの表示（`node scripts/chrome-evidence.mjs`）:

| URL | 幅 | `innerWidth` | 横のスクロール | 画面の写真 |
|---|---|---|---|---|
| `/issues/21` | 1280 | 1280 | 無し | ![](evidence/2026-11-18-tdd-and-code-review/issue-21-1280.jpg) |
| `/issues/21` | 768 | 768 | 無し | ![](evidence/2026-11-18-tdd-and-code-review/issue-21-768.jpg) |
| `/issues/21` | 375 | 375 | 無し | ![](evidence/2026-11-18-tdd-and-code-review/issue-21-375.jpg) |

- コンソール: エラー 0、警告 0
- 通信: GitHub 自身の 2 つの URL が 404（ログインしていないときに GitHub が返すもの）。このため `chrome-evidence.mjs` の終了コードは 1 になる

## 見つけた問題

| # | 見つけたもの | 見つけ方 | 対応 |
|---|---|---|---|
| 1 | issue のルールに「最初に書いて落とすテストを『検証』に名前で書く」と入れたのに、起票した PBI の「検証」は `pnpm verify` だけだった | Chrome で #19 を開いて読んだ | コードを変える PBI 23 件に、最初に落とすテストを書き足した |
| 2 | `check-docs.mjs` に 14 件の欠け（上の「コードレビュー」） | 独立したレビュー 3 回 | 全部直した。テストは 0 件から 51 件になった |
| 3 | **`main` の CI を落とした。** `node --test scripts/` は Node.js 26 では動くが、CI の Node.js 24 では「Cannot find module …/scripts」で落ちる | push のあと CI を最後まで見た | 次の commit（`7f8c57d`）で、テストのファイルを名前で渡す形に直した。品質のルールに「手元の Node.js が `.nvmrc` と違うときは、手元の合格を信じない」を足した |
| 4 | 3 回目のレビューが `APPROVE` と一緒に minor の指摘を出した場合の扱いが、ルールに無かった | 手順を進めていて気づいた | コードレビューのルールに足した（レビューが示した直し方をそのまま、テストを先に書いて入れるなら、もう 1 回は要らない） |
| 5 | `chrome-evidence.mjs` は、GitHub のページに対しては必ず終了コード 1 を返す（GitHub 自身の 404 のため） | 実行の結果 | 直していない。アプリに対しては正しい振る舞い。GitHub のページを撮るときは、出力の中身を読んで判断する |
