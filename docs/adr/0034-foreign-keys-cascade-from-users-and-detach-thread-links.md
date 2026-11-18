---
type: ADR
title: "ADR-0034: 外部キーは、人を消すとその人のものを一緒に消し、投稿の間のつながりは外すだけにする"
description: "ユーザーと投稿への外部キーは ON DELETE CASCADE、返信・スレッド・引用の参照は ON DELETE SET NULL、リポストの元は CASCADE にし、新しい順の索引は DESC NULLS FIRST で作る。"
tags: [data-model, database]
status: stable
---

# ADR-0034: 外部キーは、人を消すとその人のものを一緒に消し、投稿の間のつながりは外すだけにする

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: ADR-0006、ADR-0016、[データモデル](../architecture/data-model.md)、#16

## 背景

[データモデル](../architecture/data-model.md) は「投稿は作者を消すと一緒に消す」とだけ決めていて、ほかの参照を消したときの振る舞いを決めていなかった。投稿を消すのは `deleted_at` を入れる論理の削除で、行は残る。行が本当に消えるのは、人（とその人の投稿）を消したときだけになる。

#16 で、新しい順の索引を Drizzle の `.desc()` で作ると `DESC NULLS LAST` になることが分かった。PostgreSQL の `ORDER BY id DESC` は `NULLS FIRST` なので、その索引は並べ替えに使われない。

## 決定

- **人（`users`）を参照する外部キーは、全て `ON DELETE CASCADE`。** 投稿・画像・いいね・ブックマーク・フォロー・メンション・通知・セッション・アカウント
- **投稿を参照する外部キーのうち、その投稿が無ければ意味の無い行は `ON DELETE CASCADE`**: いいね・ブックマーク・画像の結びつき・ハッシュタグの結びつき・メンション・通知・**リポスト**（`repost_of_id`。元が無いリポストは空の行になる）
- **返信の相手・スレッドの最初・引用の元（`reply_to_id`・`root_id`・`quote_of_id`）は `ON DELETE SET NULL`。** 他人の返信や引用は、相手の投稿が消えても残す
- `users.pinned_post_id` には外部キーを付けない（`users` と `posts` が互いを参照する輪になる）。固定した投稿を消すときは、アプリが null にする
- **新しい順の索引は `DESC NULLS FIRST` で作る**（Drizzle では `.desc().nullsFirst()`）。`ORDER BY … DESC` の既定と同じにして、索引が並べ替えに使われるようにする

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| 人から CASCADE、投稿の間のつながりは SET NULL（採用） | 人を消すと痕跡が残らない。他人の返信と引用は残る | 返信の相手が消えると、返信はどこへの返信か分からなくなる |
| 全部 CASCADE | 単純 | 人を消すと、その人への他人の返信まで消える |
| 外部キーを付けない | 書き込みが少し速い | 消えた行を指す ID が残り、画面で壊れる |
| 索引を `DESC NULLS LAST` のまま、問い合わせに `NULLS LAST` を書く | Drizzle の既定のまま | 全ての問い合わせで書き忘れると、索引が使われない |

## 結果

- `src/shared/db/schema/` と `drizzle/0001_initial_schema.sql` がこの形になっている。索引の形は `src/shared/db/schema.test.ts` が `pg_indexes` で確かめる
- 返信の相手が消えた返信は、画面では「返信の相手は削除されました」と出す（返信の画面の PBI で扱う）
- 人を消す機能を作るときは、`pinned_post_id` と数の列（`followers_count` など）をアプリで直す
