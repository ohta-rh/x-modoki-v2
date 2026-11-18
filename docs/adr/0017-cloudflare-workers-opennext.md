---
type: ADR
title: "ADR-0017: 本番は Cloudflare Workers で、Next.js そのものを OpenNext のアダプターで動かす"
description: "本番は Cloudflare Workers に置き、Next.js 16.4 そのものを `@opennextjs/cloudflare` で動かし、PostgreSQL へは Hyperdrive でつなぎ、vinext は使わない。"
tags: [deployment, infrastructure, cloudflare]
status: stable
---

# ADR-0017: 本番は Cloudflare Workers で、Next.js そのものを OpenNext のアダプターで動かす

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: ユーザー（Cloudflare で動かす）／エージェント（手段と細目）
- 関連: [Cloudflare Workers で動かす方法の調査](../research/cloudflare.md)、ADR-0004、ADR-0006、ADR-0011、ADR-0012（この ADR で置き換え）、ADR-0018、ADR-0019

## 背景

ユーザーは 2026-11-18 に「Cloudflare で動かす前提でよい」と指示した。ADR-0012 は 1 台の VPS と Docker Compose を本番としていた。

2026-11-18 に公式の情報で確認した事実:

- Cloudflare は、新しい Next.js のアプリに vinext を勧めている。vinext は Next.js の API を Vite の上に作り直したもので、Next.js そのものではない
- Next.js そのものを Workers で動かす手段は OpenNext（`@opennextjs/cloudflare`）。1.20.17 の peer は `next >=16.4.5` で、Next.js 16 の全てのマイナーに対応すると書かれている
- OpenNext では、`proxy.ts` は実験的な対応。Cache Components という名前での対応は書かれていない（`'use cache'` と PPR は対応と書かれている）
- Workers の Free は 1 リクエストの CPU が 10 ミリ秒まで。Paid は月 $5
- Hyperdrive は Free にも Paid にも含まれる。`pg` は `nodejs_compat` で動く
- Workers では、ネイティブのモジュール（`sharp`）、ディスクへの書き込み、リクエストをまたぐ接続の使い回しができない

## 決定

- **本番は Cloudflare Workers。Next.js 16.4 そのものを `@opennextjs/cloudflare` 1.20 系で動かす。** vinext は使わない（ADR-0004 の「最新の Next.js」を守る）
- ADR-0012（1 台の VPS と Docker Compose、Caddy）は置き換える。`output: 'standalone'` と本番用の Compose は作らない
- **PostgreSQL は Cloudflare の外に置き（Neon）、Hyperdrive でつなぐ。** ADR-0006 の PostgreSQL と Drizzle は変えない
- **データベースへの接続は、リクエストごとに作る。** `getDb()`（`src/server/db/client.ts`）の 1 か所で作り、React の `cache()` で同じリクエストの中では 1 つにする。モジュールの一番上で接続やプールを作らない（ADR-0006 の「プールを 1 つ持つ」を置き換える）
- 画像は Cloudflare R2。S3 の API で読み書きする（ADR-0008 のまま）
- 定期的な処理は Cloudflare の Cron Triggers から呼ぶ（ADR-0011 の「ホストの cron」を置き換える）
- **最初の日から、Workers で動かないものをサーバーのコードに入れない。** ネイティブのモジュール、`fs` への書き込み、リクエストをまたいで値を持つモジュールの変数、常に動くプロセスを前提にした処理（`setInterval`、接続の保持）
- `proxy.ts` は ADR-0004 のとおり使う。OpenNext で動かなければ、ログインへ送る処理を `(main)` のレイアウトへ移す（認可はもともとデータアクセス層にあるので、安全性は変わらない）
- ローカルの開発は `next dev` と Docker Compose（PostgreSQL と S3 互換のストレージ）のまま。Workers の実行環境での確認は `opennextjs-cloudflare preview` で行う
- Cloudflare への配備を作るのは、ローカルで全部が動いたあと（ADR-0019）

## 検討した選択肢

| 選択肢 | 月の費用（USD） | 長所 | 短所 |
|---|---|---|---|
| Workers と OpenNext、Neon と Hyperdrive（採用） | 約 $5（Workers Paid。Neon Free と R2 は $0） | Next.js そのものが動く。運用が要らない。R2 と同じ場所 | Cloudflare は vinext を勧めていて、OpenNext は主流から外れつつある。`proxy.ts` は実験的。Cache Components の対応が書かれていない |
| Workers と vinext | 約 $5 | Cloudflare が勧める。配備が 1 コマンド | Next.js ではない。「最新の Next.js」の指示に反する。ビルドのときのプリレンダーが無い |
| Workers と OpenNext、データは D1 | 約 $5 | 全部が Cloudflare の中 | SQLite になり、対話的なトランザクションが使えない。ADR-0006・ADR-0015 を作り直すことになる。日本語の検索が変わる |
| 1 台の VPS と Docker Compose（ADR-0012） | 約 $6〜7 | Next.js の全部の機能がそのまま動く。ローカルと同じ構成 | ユーザーの指示に反する。運用が要る |
| Cloudflare Containers で Next.js を動かす | 未確認 | Node.js のまま動く | 料金と制限を調べていない |

## 結果

- 本番の運用（OS の更新、HTTPS、バックアップ）の多くが要らなくなる。データベースのバックアップは Neon の仕組みを使う
- サーバーのコードに制約が付く。`sharp` を使えないので、画像の変換を変える（ADR-0018）
- リクエストごとに接続を作るので、Hyperdrive を必ず通す。Free は 1 日 100,000 回の問い合わせまで
- Free の CPU 10 ミリ秒は、サーバーで描くページには足りない見込み（測っていない）。月 $5 の Paid を見込む
- `'use cache'` を使うには、R2 のインクリメンタルキャッシュと、D1 か Durable Objects のタグのキャッシュの設定が要る。使うのはトレンドとおすすめのユーザーだけなので、動かなければキャッシュをやめる
- Cloudflare への配備の最初の作業で、Cache Components・`proxy.ts`・Better Auth・Hyperdrive 経由の Drizzle が Workers の実行環境で動くことを確かめる。動かないものは、ADR を書いて替える
- OpenNext の保守が止まったら、vinext へ移るか Cloudflare から出るかを、新しい ADR で決める
