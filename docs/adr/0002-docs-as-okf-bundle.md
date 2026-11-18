---
type: ADR
title: "ADR-0002: `docs/` を Open Knowledge Format（OKF）v0.2 のバンドルとして管理する"
description: "Markdown のドキュメントは全て `docs/` に置き、`type` を持つ YAML の frontmatter と各ディレクトリの `index.md` を備えた OKF v0.2 のバンドルにする。"
tags: [process, documentation]
status: stable
---

# ADR-0002: `docs/` を Open Knowledge Format（OKF）v0.2 のバンドルとして管理する

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: ユーザー（形式の採用）／エージェント（下の細目）
- 関連: ADR-0001

## 背景

ドキュメントは人だけでなく AI エージェントも読む。種類・要約・今も有効かどうかが本文の中にしか無いと、どれを読むべきかを決めるのに全部の本文を開く必要がある。

Open Knowledge Format（OKF）は Google Cloud が公開した仕様で、知識を「YAML の frontmatter を持つ Markdown のディレクトリ（バンドル）」として表す。v0.2 を 2026-11-18 に `GoogleCloudPlatform/open-knowledge-format` の `SPEC.md` で確認した。適合の条件は次の 3 つだけで、専用のツールは要らない。

1. 予約名（`index.md`・`log.md`）以外の全ての `.md` が、解析できる YAML の frontmatter を持つ
2. その frontmatter が空でない `type` を持つ
3. `index.md` と `log.md` は仕様の形に従う（`index.md` は frontmatter を持たない。例外はバンドルの root の `okf_version` だけ。`log.md` の日付の見出しは `YYYY-MM-DD`）

ユーザーは 2026-11-18 に「Markdown のドキュメントは OKF で管理する」と指示した。

## 決定

- **プロジェクトのドキュメントは全て `docs/` に置き、`docs/` を OKF v0.2 のバンドルの root にする。** `docs/index.md` に `okf_version: "0.2"` を書く
- 予約名以外の `.md` は、先頭に frontmatter を持つ。`type` は必須。`title`（本文の H1 と同じ）・`description`（一文）・`tags`・`status`（`draft` / `stable` / `deprecated`）も書く
- `type` は `docs/index.md` に並べた値（`ADR`・`Template`・`Reference`・`Architecture`・`Design`・`Research`・`Guide`）を使う。足すときは同じ commit でそこに足す
- 1 ファイルに 1 つの概念だけを書く。パスが概念の ID になるので、動かすときはリンクを同じ commit で直す
- 各ディレクトリに `index.md` を置き、`* [タイトル](パス) - 説明` の形で中身を並べる。例外は `docs/adr/` で、一覧は `README.md`（`type: Reference`）に表で持つ
- `docs/log.md` に、ドキュメントの追加・廃止・内容の変更を日付ごとに新しい順で書く
- **ドキュメントの間のリンクは相対パスの Markdown リンクにする。** OKF が勧める `/` 始まりのバンドル相対のリンクは使わない
- ADR のステータスの正本は本文の「ステータス」の行。frontmatter の `status` はそれを写したもので、同じ commit で直す

| 本文のステータス | frontmatter の `status` |
|---|---|
| 提案 | `draft` |
| 採用 | `stable` |
| 却下・廃止・置き換え | `deprecated` |

- `generated`・`verified`・`sources`・`stale_after` は書かない。調査日と出典は本文に書く
- リポジトリの root の `README.md`、`CLAUDE.md`、`.claude/` の下はバンドルの外。それぞれのツールが決めた形式のままにする

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| `docs/` を OKF v0.2 のバンドルにする（採用） | frontmatter だけで種類・要約・有効かどうかが分かる。Git に載り GitHub で読める。ツールに依存しない | 文書を足すたびに frontmatter・`index.md`・`log.md` を直す |
| frontmatter 無しの素の Markdown | 書く手間が最小 | 種類と状態が機械的に読めない。エージェントが全文を読むことになる |
| ドキュメントサイトのツール（Docusaurus など）の形式 | 見た目の良いサイトになる | ツールに依存する。frontmatter の意味がツールごとに違う |
| ADR の一覧も `index.md` にする | OKF の決まった形だけになる | `index.md` は frontmatter も表も持てず、ステータスの列を出せない。GitHub がディレクトリの表示で出すのは `README.md` |
| リンクを `/` 始まりのバンドル相対にする（OKF の推奨） | ファイルをディレクトリの中で動かしても切れない | GitHub ではリポジトリの root からのパスと解釈され、リンクが切れる |

## 結果

- frontmatter と `index.md` を読めば、開くべき文書が分かる
- 文書の追加・廃止のたびに、`index.md`（ADR は `README.md`）と `log.md` を同じ commit で直す必要がある
- ADR のステータスは本文と frontmatter の 2 か所にある。ずれは commit の前の確認（`.claude/rules/documentation.md` の 4 節）で防ぐ。機械的に確かめる仕組みはまだ無い（2026-11-18 追記: `scripts/check-docs.mjs` が確かめるようになり、CI で動く）
- 運用の細目は `.claude/rules/documentation.md` に置く。この ADR と食い違う変更をするときは、新しい ADR で置き換える
