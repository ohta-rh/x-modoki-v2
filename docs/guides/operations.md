---
type: Guide
title: "困ったときの手順"
description: "CI が落ちた、マイグレーションが失敗した、スキーマの変更を戻したい、データベースを保存して戻したい、画像がたまった、依存の更新で壊れた、秘密の値を commit した、の 7 つの場面ごとに、確かめるコマンド・直すコマンド・してはいけないことを示す。"
tags: [guide, operations, local]
status: stable
---

# 困ったときの手順

- ローカルと CI のための手順（マイルストーン 1）。本番の監視と障害の対応はマイルストーン 2 で足す
- 動かし方そのものは [ローカルで動かす](local-development.md)、決まりは [環境と配備](../architecture/environments.md) と、リポジトリの `.claude/rules/quality-gates.md`
- **消す操作は、対象を名前で 1 つずつ指定する。** ワイルドカードやパターンで消さない。消す前に、消すものを一覧で見る

## 1. `main` の CI が落ちた

確かめる:

```sh
gh run list --branch main --limit 5
gh run view <実行の番号> --log-failed
```

直す:

- ほかの作業より先に直す（[ADR-0073](../adr/0073-ci-scope-docs-only-and-e2e-per-browser.md)）。手元で同じ確認を流して再現する: `PORT=3300 pnpm verify`（依存の監査は `pnpm audit --prod --audit-level high`）
- 落ちたテストを先に再現させ、根本原因を 1 文で言えるようにしてから直す（`.claude/rules/bug-handling.md`）
- 1 回で直せないなら、落とした commit を取り消してから直す: `git revert <commit>` のあと、いつもどおり push する
- 画面のテストが落ちたときは、CI の成果物 `playwright-report` に画面の写真と操作の記録がある: `gh run download <実行の番号> -n playwright-report -D <空のディレクトリ>`

してはいけないこと:

- `continue-on-error`、テストの `.skip` と `.only`、`--no-verify`、しきい値を下げる、落ちる確認を消す
- 履歴を書き換えて強制で push する
- 「手元では通る」で済ませる。手元の Node.js が `.nvmrc` と違うときは、CI の結果を本当とする

## 2. マイグレーションが途中で失敗した

確かめる:

```sh
docker compose exec -T db psql -U xmodoki -d xmodoki -c "select id, created_at from drizzle.__drizzle_migrations order by id"
ls drizzle
```

- 当たったマイグレーションの数（行の数）と、`drizzle/` の SQL の数を比べる
- Drizzle ORM 0.45 の migrator は、まだ当てていないマイグレーションを全部 1 つのトランザクションで流す（`drizzle-orm/pg-core/dialect.js` の `migrate`、2026-11-20 に確かめた）。途中で失敗したら、その回の分は全部戻り、表は失敗の前のまま

直す:

- 失敗の文言（`pnpm db:migrate` の出力）から、どの文で落ちたかを見る。SQL を直すのは、まだどこにも当たっていないマイグレーションだけ。もう当たったものは直さず、新しいマイグレーションを足す（3 節）
- 中身の行が原因（`NOT NULL` を足したのに空の行がある、など）なら、先に行を直すマイグレーションを足す
- 戻れなくなったときのために、マイグレーションの前に 4 節の保存をしておく

してはいけないこと:

- `drizzle.__drizzle_migrations` の行を手で消す・足す（当たったかどうかの記録がずれる）
- もう当たったマイグレーションの SQL を書き換える
- `CREATE INDEX CONCURRENTLY` のような、トランザクションの中で動かない文をマイグレーションに入れる

## 3. スキーマの変更を取り消したい

確かめる:

```sh
git log --oneline -- src/shared/db/schema drizzle
```

直す:

- **前へ進めて戻す。** `src/shared/db/schema/` を前の形に戻し、`pnpm db:generate` で戻すためのマイグレーションを作り、`pnpm db:migrate` で当てる。作った SQL を読んで、消える列と行が意図どおりかを確かめる
- まだ `main` にも誰の手元にも当たっていないマイグレーションなら、その commit を `git revert` してよい

スキーマの変更の決まり（列を消すのは、使うコードを消した次の変更）:

- 列や表を消す・名前を変えるのは、2 回に分ける。1 回目で新しい形を足してコードをそちらに移し、2 回目（次の変更）で古い列を消す。1 回でやると、古いコードと新しいスキーマが同時に動く間（ブラウザに残った画面、配備の途中）に壊れる
- 例: `users.location` を `users.place` に変える
  1. 1 回目の変更: `place` の列を足し、`location` の中身を写すマイグレーションを足す。読み書きのコードを `place` に替える。`location` はまだ消さない
  2. 2 回目の変更（1 回目が CI で緑になり、取り込まれたあと）: `location` を使うコードが無いことを `git grep -n location src` で確かめてから、`location` を消すマイグレーションを足す

してはいけないこと:

- 当たったマイグレーションのファイルを消して作り直す
- 本番のデータベースに `drizzle-kit push` を使う（マイグレーションの記録が残らない）

## 4. ローカルのデータベースを保存して戻したい

保存する:

```sh
docker compose exec -T db pg_dump -U xmodoki -d xmodoki -Fc > xmodoki.dump
```

確かめる（戻す前に、別のデータベースに戻して中身を見る）:

```sh
docker compose exec -T db createdb -U xmodoki xmodoki_restore_check
docker compose exec -T db pg_restore -U xmodoki -d xmodoki_restore_check --no-owner < xmodoki.dump
docker compose exec -T db psql -U xmodoki -d xmodoki_restore_check -c "select count(*) from users"
docker compose exec -T db dropdb -U xmodoki xmodoki_restore_check
```

戻す（今の中身は消える。先に今の中身も保存する）:

```sh
docker compose exec -T db pg_restore -U xmodoki -d xmodoki --clean --if-exists --no-owner < xmodoki.dump
```

- 画像は Garage にあり、この保存には入らない。データベースだけを戻すと、画像の行が指す物が無いことがある
- ダンプのファイルはリポジトリの外に置く（リポジトリに入れない）

実際に流した記録（2026-11-20、ローカルの `xmodoki`、ダンプは 23,335,177 バイト）: 上の「保存する」と「確かめる」をそのまま流し、元と戻した先で 5 つの表の行の数を比べた。全部同じだった。

| 表 | 元の `xmodoki` | 戻した `xmodoki_restore_check` |
|---|---|---|
| `users` | 55,981 | 55,981 |
| `posts` | 146,021 | 146,021 |
| `follows` | 2,504 | 2,504 |
| `likes` | 5,948 | 5,948 |
| `media` | 9,548 | 9,548 |

してはいけないこと:

- 戻す先を確かめずに `--clean` で戻す
- 共有のコンテナ（`db`、`storage`）を止めて作り直して直そうとする。ボリュームを消すのは [ローカルで動かす](local-development.md) の 4 節の、全部を最初からやり直すときだけ

## 5. ストレージに結びつかない画像がたまった

確かめる:

```sh
docker compose exec -T db psql -U xmodoki -d xmodoki -c "select status, count(*) from media group by status"
```

- `pending` の行は、送ったが投稿にもプロフィールにも使われていない画像。24 時間を過ぎたものが掃除の対象

直す:

```sh
curl -X POST -H "Authorization: Bearer <.env.local の CRON_SECRET>" http://localhost:3000/api/cron/cleanup-media
```

- 応答は `{"removed": N}`。24 時間を過ぎた `pending` の行と、その物を消す（`src/features/media-cleanup/api/cleanup-media.ts`、#25）。本番では Cron Triggers が 1 日に 1 回呼ぶ（マイルストーン 2）

してはいけないこと:

- `media` の行やバケットの物を、パターンで手で消す。使われている画像まで消える
- `CRON_SECRET` をコマンドの履歴や記録、issue に残す

## 6. 依存の更新で壊れた

確かめる:

```sh
git log --oneline -- package.json pnpm-lock.yaml
pnpm why <パッケージの名前>
```

直す:

- 壊した更新の commit を `git revert` し、`pnpm install` して `PORT=3300 pnpm verify` が通ることを確かめる
- 直す方を先に入れるなら、上げた版のどこで壊れたかを、変更の履歴（リリースノート）で確かめてから直す
- Dependabot の PR は、CI が緑でも Chrome でアプリを見てから取り込む。メジャーと、ADR が固定した系列（Next.js 16.4、React 19.3、TypeScript 6.0、Node.js 24、Drizzle 0.45、Playwright）は ADR を書いてから（[ADR-0071](../adr/0071-dependabot-weekly-updates-pinned-lines-by-adr.md)）。Playwright は、`ci.yml` と `docker-compose.yml` のイメージの名前と同じ変更で動かす

してはいけないこと:

- `pnpm audit` を `--ignore` やしきい値の引き下げで通す
- `pnpm-lock.yaml` を消して作り直す（関係の無い依存まで動く）

## 7. 秘密の値をうっかり commit した

確かめる:

```sh
git log -p -S '<漏れた値の一部>' --all
```

直す:

- **最初に、その値を使えなくする。** commit を消しても、push した値は見られたと考える
  - `BETTER_AUTH_SECRET` と `CRON_SECRET`: `.env.local` のその行の値を空にして `sh scripts/setup-local.sh` を流すと、新しい乱数で埋まる（`scripts/fill-env.mjs`）。全員のログインが切れる
  - S3 のキー: Garage のキーを作り直し、`sh scripts/setup-local.sh` で `.env.local` を合わせる
  - 外のサービスの鍵（マイルストーン 2 以降）: そのサービスで鍵を無効にし、新しい鍵を作る
- 次の commit で値をファイルから消し、同じ値が二度と入らないように `.gitignore` か設定の読み方を直す
- 履歴から消すかどうかは、リポジトリの持ち主が決める。履歴の書き換えは強制の push を伴うので、エージェントは行わない

してはいけないこと:

- 値を変えずに、commit を消すだけで済ませる
- 漏れた値を issue・PR・試験レポート・画面の写真に書き写す
