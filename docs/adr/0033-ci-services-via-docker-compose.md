---
type: ADR
title: "ADR-0033: CI の PostgreSQL と Garage は、GitHub Actions の services: ではなく、手元と同じ Docker Compose で動かす"
description: "CI のデータベースと画像の置き場所を、`scripts/setup-local.sh` が立ち上げる Docker Compose で動かし、手元と CI の準備を 1 つの手順にする。"
tags: [ci, toolchain, local-development]
status: stable
---

# ADR-0033: CI の PostgreSQL と Garage は、GitHub Actions の services: ではなく、手元と同じ Docker Compose で動かす

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: ADR-0020（CI のコンテナを「サービスのコンテナ」としていた部分を置き換える）、ADR-0008、ADR-0013、[環境と配備](../architecture/environments.md)

## 背景

ADR-0020 は、CI のテストを「サービスのコンテナ」の PostgreSQL と S3 互換のストレージに対して動かすとした。#15 で CI を作ると、次のことが分かった。

- Garage v2.5.0 は、起動のときに設定のファイル（`garage.toml`）が要る。GitHub Actions の `services:` は、リポジトリを checkout する前にコンテナを立ち上げるので、リポジトリの中の設定をマウントできない
- Garage は、立ち上げたあとに、配置（layout）・バケット・キー・公開の設定を、コマンドで作る必要がある。この手順は手元では `scripts/setup-local.sh` が行う
- `services:` と手元の Docker Compose を両方持つと、ポート・版・設定が 2 か所に分かれる

## 決定

- **CI でも、`sh scripts/setup-local.sh` で、`docker-compose.yml` の PostgreSQL と Garage を立ち上げる。** GitHub Actions の `services:` は使わない
- 手元と CI は、同じ `docker-compose.yml`・同じ版・同じポート（54320・3900・3902）・同じ準備のスクリプトを使う
- 偽物にしない（ADR-0013）ことと、7 つの確認（ADR-0020）は変えない

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| CI も Docker Compose と `setup-local.sh`（採用） | 手元と CI が 1 つの手順。設定をリポジトリからマウントできる | コンテナを立ち上げる数十秒が、確認の前に直列で入る |
| `services:` で PostgreSQL、Garage は Compose | PostgreSQL の準備が並列になる | 2 つの仕組みが混ざり、ポートと版が 2 か所になる |
| `services:` で両方、設定は後から `docker cp` して再起動 | ADR-0020 の文言どおり | 手順が CI だけのものになり、手元で試せない |

## 結果

- CI の設定（`.github/workflows/ci.yml`）は、`setup-local.sh` を 1 回呼ぶだけになる
- `setup-local.sh` の手順が壊れると、手元より先に CI で分かる
- `docker-compose.yml` を変えるときは、CI でもそのまま使われることを前提にする
