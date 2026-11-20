---
type: TestReport
title: "試験レポート: 困ったときの手順が、運用の手順書にある"
description: "#38 で、7 つの場面ごとの困ったときの手順書を書き、データベースの保存と戻しを実際に流して件数が同じことを確かめ、GitHub で描かれ方を見た記録。"
tags: [test-report, guide, operations]
status: stable
---

# 試験レポート: 困ったときの手順が、運用の手順書にある

## 対象

- issue: [#38](https://github.com/ohta-rh/x-modoki-v2/issues/38)
- commit: `e2044e6`（ブランチ `m1/local-app`、PR #40）
- CI: [実行 44582023857](https://github.com/ohta-rh/x-modoki-v2/actions/runs/44582023857)（成功）
- 日付: 2026-11-20

## 環境

- macOS 26.2、Google Chrome（拡張から操作）、Docker Compose の PostgreSQL 18（`postgres:18-alpine`）
- 保存と戻しは、ローカルの開発のデータベース `xmodoki` を読み、確かめ用に作った `xmodoki_restore_check` に戻した（終わったあと消した）

## 判定

合格 — 受け入れ条件 4 件のうち 4 件を満たした。

## 受け入れ条件ごとの結果

| # | 条件 | 確かめ方 | 結果 | エビデンス |
|---|---|---|---|---|
| 1 | `docs/guides/operations.md`（`type: Guide`）に、7 つの場面ごとの手順（確かめるコマンド・直すコマンド・してはいけないこと） | 7 つの場面と節を突き合わせた: 1 CI が落ちた、2 マイグレーションが途中で失敗した、3 スキーマの変更を取り消したい、4 データベースを保存して戻したい、5 結びつかない画像がたまった、6 依存の更新で壊れた、7 秘密の値を commit した。どれも 3 つの小見出しがある | 合格 | `guide-top.jpg` |
| 2 | `pg_dump` と `pg_restore` を実際に 1 回流し、件数が同じ記録 | 手順書の 4 節のコマンドをそのまま流した（下）。5 つの表の行の数が全部同じ。記録を 4 節に載せた | 合格 | `guide-restore.jpg` |
| 3 | スキーマの変更の規則（列を消すのは、使うコードを消した次の変更）が例つき | 3 節: `users.location` を `users.place` に変える 2 回の変更の例 | 合格 | `guide-restore.jpg` |
| 4 | `docs/guides/index.md` と `docs/log.md` の更新 | `node scripts/check-docs.mjs` → `docs check passed: 186 file(s)` | 合格 | — |

保存と戻しの記録（2026-11-20）:

```
$ docker compose exec -T db pg_dump -U xmodoki -d xmodoki -Fc > xmodoki.dump      # dump=0 size=23335177
$ docker compose exec -T db createdb -U xmodoki xmodoki_restore_check               # create=0
$ docker compose exec -T db pg_restore -U xmodoki -d xmodoki_restore_check --no-owner < xmodoki.dump   # restore=0
元 / 戻した先
follows|2504 follows|2504
likes|5948 likes|5948
media|9548 media|9548
posts|146021 posts|146021
users|55981 users|55981
SAME
$ docker compose exec -T db dropdb -U xmodoki xmodoki_restore_check                 # drop=0
```

書いた内容の確かめ:

- Drizzle ORM 0.45 の migrator が、まだ当てていないマイグレーションを 1 つのトランザクションで流すことを、`drizzle-orm/pg-core/dialect.js` の `migrate` で確かめた（`session.transaction`）。当たっているマイグレーションは 2 つ（`drizzle.__drizzle_migrations`）
- 画像の掃除が 24 時間を過ぎた `pending` だけを消すことを、`src/features/media-cleanup/api/cleanup-media.ts` で確かめた。`media.status` は `pending` と `ready`（今は 2,648 と 6,900）
- 秘密の値の作り直しは、`scripts/setup-local.sh` が空の値だけを乱数で埋めること（`scripts/fill-env.mjs`）による。`.env.local` は読んでいない

## 自動のテスト

文書だけの変更。`node scripts/check-docs.mjs` が通り、CI（8 つの確認と `fresh-clone`）が緑。

### TDD の記録

コードの変更なし

## コードレビュー

コードの変更なし

## ブラウザでの確認

| URL | 幅 | テーマ | した操作 | 見えた結果 | 画面の写真 |
|---|---|---|---|---|---|
| GitHub の `docs/guides/operations.md`（`m1/local-app`） | 1372 | GitHub のダーク | 開いて、上と 4 節を読んだ | frontmatter の表、見出し、コードの塊（`docker compose exec …` の `exec` も）、番号の付いた例、件数の表、リンクが正しく出る | `guide-top.jpg`、`guide-restore.jpg` |

- 文書だけの PBI なので、GitHub で描かれたものを見た（`.claude/rules/definition-of-done.md`）

![手順書の上](evidence/issue-0038-operations-guide/guide-top.jpg)
![3 節の終わりと 4 節](evidence/issue-0038-operations-guide/guide-restore.jpg)

## 見つけた問題

1. 手順書をシェルのコマンドで書こうとしたとき、文書の中の強制の push の言葉にゲート（`validate-bash`）が反応して止めた。ゲートは変えず、ファイルの書き込みの道具で書き、文書にもその言葉そのものは書かない形にした
