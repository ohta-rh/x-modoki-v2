---
type: Guide
title: "ローカルで動かす"
description: "まっさらな clone から x-modoki をローカルで動かし、確かめ、データベースを作り直すまでの手順と、よくある失敗の直し方を示す。"
tags: [guide, local, setup]
status: stable
---

# ローカルで動かす

- 1 節と 2 節のコマンドは、CI がまっさらなランナーでこの文書から読み出してそのまま流し、シードの人で `/home` に入れることを確かめている（[ADR-0069](../adr/0069-ci-runs-the-local-guide-on-a-fresh-clone.md)）。コマンドを変えるときは、この文書を変える
- コマンドの一覧と環境変数は [環境と配備](../architecture/environments.md)

## 0. 要るもの

- Node.js 24（`.nvmrc`）。`nvm use` などで合わせる
- pnpm 12.19.0（`package.json` の `packageManager`）。`corepack enable` で入る。手元の pnpm が違う版なら、各コマンドを `npx -y pnpm@12.19.0 <コマンド>` で動かす
- Docker（Docker Desktop など）。PostgreSQL と、画像を置く Garage（S3 互換）をコンテナで動かす
- 空いているポート: 3000（アプリ）、54320（PostgreSQL）、3900・3902（Garage）。macOS では 3333（画面のテストの WebKit）も

## 1. 最初の準備

clone したディレクトリで、上から順に流す。

```sh
pnpm install
sh scripts/setup-local.sh
pnpm db:migrate
pnpm db:seed
```

- `scripts/setup-local.sh` は、Garage の設定を作り、コンテナを立ち上げ、バケットとキーを作り、`.env.local` の空の値（認証の秘密の値、S3 のキー）を埋める。秘密の値は機械ごとに乱数で作り、リポジトリには入れない。何度流してもよい
- `pnpm db:seed` は、架空の 20 人・投稿 300 件・フォロー・いいねを入れる。もう人がいるデータベースには何もしない

## 2. 毎日の起動

```sh
sh scripts/setup-local.sh
pnpm dev
```

- `http://localhost:3000` を開く。シードの人で入るには、`/i/flow/login` でユーザー名 `sample01`（`sample01`〜`sample20`）、パスワード `sample-password`。開発用の決まった値で、本物のサービスには使わない（[ADR-0068](../adr/0068-seed-people-sign-in-with-a-published-dev-password.md)）
- 新しく登録してもよい。メールアドレスは確かめない（[ADR-0007](../adr/0007-better-auth-db-sessions.md)）
- 本番の形で動かすときは `pnpm build && pnpm start`（Cache Components と `<Suspense>` は、開発のサーバーと振る舞いが違う）

## 3. テストの動かし方

| コマンド | すること |
|---|---|
| `pnpm test` | Vitest（単体と、本物の PostgreSQL に対するデータアクセス層）。テストはワーカーごとに自分のデータベースを作る |
| `pnpm test --coverage` | カバレッジつき。4 つとも 100% でなければ落ちる |
| `PORT=3300 pnpm test:e2e` | Playwright（Chromium・Firefox・WebKit）。`pnpm build` のあとに。アプリを 3300 番で立ち上げる（3000 で開発のサーバーが動いていてもぶつからない） |
| `PORT=3300 pnpm verify` | CI と同じ 7 つの確認を順に全部。push の前に流す |

- 画面のテストのブラウザは `pnpm exec playwright install chromium firefox` で入れる。macOS の WebKit は、`setup-local.sh` が立ち上げる `webkit` のコンテナ（CI と同じイメージ）で動く

## 4. データベースの作り直し

スキーマを変えたら、マイグレーションを作って流す。

```sh
pnpm db:generate
pnpm db:migrate
```

手元のデータを全部消して最初からやり直すときは、コンテナとボリュームを消してから 1 節をもう一度流す。PostgreSQL の全部の行と、Garage の全部の画像が消える。

```sh
docker compose down -v
sh scripts/setup-local.sh
pnpm db:migrate
pnpm db:seed
```

## 5. シード

- `pnpm db:seed` は、`.env.local` の `DATABASE_URL` のデータベースに入れる。中身は決まっていて、何度作っても同じ
- 人は `sample01`〜`sample20`（名前は「サンプル 01」など、メールアドレスは `sample01@example.test` など）。パスワードは全員 `sample-password`
- もう 1 人でもいるデータベースには何もしない（手で作ったデータを消さないため）。シードをやり直すには、4 節で作り直す

## 6. よくある失敗と直し方

| 起きたこと | 原因 | 直し方 |
|---|---|---|
| `ERR_PNPM_BAD_PM_VERSION` や、pnpm の自動の切り替えの失敗 | 手元の pnpm が 12.19.0 でない | `corepack enable`、または `npx -y pnpm@12.19.0 <コマンド>` |
| `setup-local.sh` が `Cannot connect to the Docker daemon` | Docker が動いていない | Docker Desktop を立ち上げてから流し直す |
| `setup-local.sh` が `port is already allocated` | 54320・3900・3902 を別のものが使っている | そのプロセスを止める。ポートは `docker-compose.yml` にある |
| `pnpm dev` が `EADDRINUSE: 3000` | 3000 番を別のものが使っている | 止めるか、`PORT=3300 pnpm dev`。画像の送信を許す CORS は 3000 と 3300 だけ（`scripts/lib/storage-cors.mjs`） |
| 画像を付けると「画像を送れませんでした」 | Garage が立ち上がっていないか、3000・3300 でないポートで開いている | `sh scripts/setup-local.sh` を流し直し、3000 か 3300 で開く |
| `sample01` で入れない | シードの前に人がいて、シードが何もしなかった（「the database already has users」と出る） | 4 節で作り直すか、新しく登録する |
| `pnpm db:migrate` が `ECONNREFUSED 127.0.0.1:54320` | PostgreSQL のコンテナが立ち上がっていない | `sh scripts/setup-local.sh` |
| macOS で画面のテストの WebKit だけが `ws://127.0.0.1:3333` につながらない | `webkit` のコンテナが立ち上がっていない | `sh scripts/setup-local.sh`（macOS では `webkit` も立ち上げる） |
