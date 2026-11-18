---
type: ADR
title: "ADR-0006: データは PostgreSQL に置き、Drizzle ORM 0.45 系で読み書きする"
description: "主のデータストアを PostgreSQL とし、Drizzle ORM 0.45 系と node-postgres で読み書きし、検索は pg_trgm で始める。"
tags: [database, orm, search]
status: stable
---

# ADR-0006: データは PostgreSQL に置き、Drizzle ORM 0.45 系で読み書きする

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断）
- 関連: [バックエンド技術選定](../research/backend.md)、[データモデル](../architecture/data-model.md)、ADR-0012、ADR-0015、ADR-0016

## 背景

扱うデータは、ユーザー・投稿・返信・リポスト・いいね・フォロー・通知で、関係が多い。タイムライン・通知・検索では、カーソルによるページングと結合を使う SQL を直接書く場面が多い。ローカルと本番で同じデータベースが動くことが要る。日本語の本文を検索する。規模は数十人から数千人。

2026-11-18 に確認した事実: `drizzle-orm` の `latest` は 0.45.4 で、1.0 は `rc` のまま。`prisma` の `latest` は 8.0.0 の RC、`@prisma/client` は 7.10.1。PostgreSQL の組み込みの全文検索は日本語を分けられない。`pg_trgm` は Neon でも Supabase でも素の PostgreSQL でも使える。PGroonga と pg_bigm は使える場所が限られる。

## 決定

- **主のデータストアは PostgreSQL。** ローカルも本番も、同じ公式の Docker のイメージを使う（ADR-0012）
- **ORM は Drizzle ORM 0.45 系、マイグレーションは drizzle-kit 0.31 系。** 版を固定する。1.0 が正式に出たら新しい ADR で上げる
- ドライバーは node-postgres（`pg`）。接続のプールはアプリの中に 1 つ持つ
- スキーマは TypeScript（`src/server/db/schema/`）が正本。マイグレーションは `drizzle-kit generate` で SQL のファイルを作り、リポジトリに入れる。本番に `drizzle-kit push` は使わない
- **検索は `pg_trgm` で始める。** 投稿の本文とユーザーの名前に GIN の索引を張る。ハッシュタグは別の表で、完全一致で引く

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| PostgreSQL と Drizzle 0.45（採用） | ローカルと本番が同じ。`sql` で検索やタイムラインの SQL をそのまま書ける。軽い | Drizzle は 1.0 の前で、上げるときに直しが出る |
| PostgreSQL と Prisma 7 | スキーマとマイグレーションが成熟。`include` が書きやすい | 複雑な SQL は `$queryRaw` で型を手で書く。8 への移行の途中 |
| Drizzle 1.0 の RC | 新しい API | 正式版ではなく、RC の間にも壊れる変更がある |
| SQLite / Turso | 無料の枠が大きい。運用が軽い | 日本語の検索が弱い。書き込みの量で課金される |
| PGroonga を最初から使う | 日本語の検索の質が最も高い | Groonga 入りのイメージを自分で保つ。使えるホスティングが限られる |

## 結果

- `pg_trgm` は 2 文字以下の語に弱い。検索の質が足りなくなったら、PGroonga へ替える ADR を書く
- スキーマを変えるときは、マイグレーションの SQL を読んでから commit する
