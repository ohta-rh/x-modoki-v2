# x-modoki

X（x.com）の Web 版の見た目と操作をまねた、学習用の SNS です。Next.js の 1 つのアプリで、投稿・返信・引用・リポスト・いいね・ブックマーク・フォロー・検索・通知・プロフィールの編集が動きます。

**X Corp. とは関係がありません。** 名前・ロゴ・データは全部この学習のためのもので、X のサービスやデータには一切つながりません。

![シードの人で入ったホームの画面](docs/test-reports/evidence/issue-0035-readme-and-guide/home-1280.jpg)

## 要るもの

- Node.js 24（`.nvmrc`）
- pnpm 12.19.0（`corepack enable`）
- Docker（PostgreSQL と、画像を置く Garage をコンテナで動かす）

## 動かす

```sh
pnpm install
sh scripts/setup-local.sh
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`http://localhost:3000` を開き、ユーザー名 `sample01`、パスワード `sample-password`（開発用の架空の人）で入れます。

詳しい手順・テストの動かし方・よくある失敗は [ローカルで動かす](docs/guides/local-development.md) にあります。

## 文書

設計・決定（ADR）・要件・試験の記録は [docs/index.md](docs/index.md) から辿れます。

## ライセンス

[MIT](LICENSE)
