---
type: ADR
title: "ADR-0012: `output: 'standalone'` のコンテナ 1 つで動かし、ローカルも本番も Docker Compose で同じ構成にする"
description: "Next.js を `output: 'standalone'` のコンテナ 1 つにし、PostgreSQL と S3 互換のストレージとともに Docker Compose で動かし、本番は 1 台の VPS に置く。"
tags: [deployment, infrastructure]
status: stable
---

# ADR-0012: `output: 'standalone'` のコンテナ 1 つで動かし、ローカルも本番も Docker Compose で同じ構成にする

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断）
- 関連: [バックエンド技術選定](../research/backend.md)、[環境と配備](../architecture/environments.md)、ADR-0004、ADR-0008

## 背景

1 人で作る学習用のアプリで、規模は数十人から数千人。ローカルで全部が動くことと、安く置けることが要る。運用の手間は小さくしたい。

2026-11-18 に確認した事実: Next.js を 1 つのインスタンスで自分で動かす場合、キャッシュ・画像・`after()`・ストリーミングは追加の設定がほぼ要らない。複数のインスタンスにすると、キャッシュの共有と Server Action の暗号の鍵の共有が要る。Vercel の Hobby は個人で非商用の利用に限られ、cron は 1 日に 1 回まで。月の費用の見積もりは、Vercel Hobby と Neon Free と R2 で $0、小さい VPS と Docker Compose で約 $6〜7、Fly.io で約 $14。

## 決定

- **Next.js は `output: 'standalone'` でビルドし、コンテナ 1 つで動かす**
- **ローカルも本番も Docker Compose。** ローカルは PostgreSQL と Garage をコンテナで動かし、Next.js は `pnpm dev` で動かす。本番は Next.js・PostgreSQL・Caddy（HTTPS と逆プロキシ）をコンテナで動かす
- 本番は 1 台の VPS。画像は Cloudflare R2 に置く（ADR-0008）
- インスタンスは 1 つ。複数にする仕組み（共有のキャッシュ、暗号の鍵の共有）は作らない
- マイグレーションは、アプリを起動する前に別のコマンド（`drizzle-kit migrate`）で流す
- バックアップは、`pg_dump` を 1 日に 1 回取って R2 に置く
- Vercel・Cloudflare Workers に特有の機能（Vercel Blob・Vercel Cron・Edge の実行環境）は使わない

## 検討した選択肢

| 選択肢 | 月の費用（USD） | 長所 | 短所 |
|---|---|---|---|
| 1 台の VPS と Docker Compose（採用） | 約 $6〜7 | ローカルと同じ構成。常に動くプロセスなので、後で Server-Sent Events やキューを足せる。PostgreSQL の拡張を自由に入れられる | バックアップと OS の更新を自分で行う |
| Vercel Hobby と Neon Free と R2 | $0 | 運用が要らない。配備が速い | 非商用に限られる。Neon は使わないと止まり、最初が遅い。cron は 1 日 1 回。ローカルと構成が違う |
| Vercel Pro と Neon Launch と R2 | 約 $20〜36 | 商用で使える。運用が要らない | 費用が高い。画像の変換と関数の時間に料金がかかる |
| Fly.io と自分で動かす PostgreSQL | 約 $14 | 配備が簡単。地域を選べる | VPS より高い。管理つきの PostgreSQL にすると約 $45 |
| Cloudflare Workers（OpenNext） | 未確認 | 端で動く | Worker の大きさの上限に、ORM・認証・sharp が当たりやすい |

## 結果

- `docker compose up` でローカルの依存が全部立ち上がり、本番と同じデータベースと同じ送り方で試せる
- 1 台なので、その 1 台が止まるとアプリが止まる。学習用として受け入れる
- 利用が増えて複数のインスタンスが要るときは、キャッシュの共有を含めて新しい ADR で決める
- VPS の料金と性能は、契約の前にもう一度確かめる（2026-11-18 の調査では、料金のページから性能を確認できなかった）
