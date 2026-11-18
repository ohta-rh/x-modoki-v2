---
type: TestReport
title: "試験レポート: 画面のテストが、PostgreSQL の接続の数の上限でたまに落ちる"
description: "#49 で、ローカルと CI の PostgreSQL の max_connections を 300 にし、pnpm verify を続けて流して接続の上限のエラーが出ないことと、アプリが変わらず動くことを確かめた記録。"
tags: [test-report, database, ci, bug]
status: stable
---

# 試験レポート: 画面のテストが、PostgreSQL の接続の数の上限でたまに落ちる

## 対象

- issue: [#49](https://github.com/ohta-rh/x-modoki-v2/issues/49)（バグ。#48 の `pnpm verify` で見つけた）
- commit: `bcc8f2d`、`b6c7e7d`、`0c34b6e`、`6f0348b`（ブランチ `m1/local-app`、PR #40）
- CI: [実行 44297345716](https://github.com/ohta-rh/x-modoki-v2/actions/runs/44297345716)（成功）
- 日付: 2026-11-18

## 環境

- macOS 26.2、Node.js 26.12.0（`.nvmrc` は 24。CI の実行を本当の結果とする）、Docker Compose の PostgreSQL 18、Playwright 1.65.0
- 動かし方: `docker compose up -d db`（設定が変わったので作り直された。データは名前つきのボリュームに残る）、`pnpm build && pnpm start -p 3300`

## 判定

合格 — 受け入れ条件 3 件のうち 3 件を満たした。

## 受け入れ条件ごとの結果

| # | 条件 | 確かめ方 | 結果 | エビデンス |
|---|---|---|---|---|
| 1 | Docker Compose の PostgreSQL の `max_connections` が 300 | `docker compose exec db psql -U xmodoki -c 'show max_connections'` | 合格（`300`。投稿の数 7703 も残っていた） | 下の出力 |
| 2 | `pnpm verify` の画面のテストが、続けて 2 回、接続の上限で落ちない | 直したあとの `pnpm verify` 3 回のログで `too many clients` を数えた | 合格（3 回とも 0 回） | 下の出力 |
| 3 | CI が緑 | CI の実行 | 合格 | CI の実行 |

```
$ docker compose exec -T db psql -U xmodoki -d xmodoki -tAc "show max_connections; select count(*) from posts;"
300
7703
```

## 自動のテスト

| 回 | `too many clients` | 結果 |
|---|---|---|
| 直す前（#48 の `pnpm verify`） | 6 回 | 1 で終わった（`post-detail.spec.ts` が 30 秒で止まり、WebKit の 7 本が落ちた） |
| 直したあと 1 回目 | 0 回 | 1 で終わった（WebKit のフォローのテストが移動の割り込みで落ちた。接続とは別の原因で、#50 として起票して直した） |
| 直したあと 2 回目 | 0 回 | 0 で終わった（153 本が通った） |
| 直したあと 3 回目（#50 を直したあと） | 0 回 | 0 で終わった（153 本が通った） |

```
 Test Files  118 passed (118)
      Tests  631 passed (631)
Statements   : 100% ( 1687/1687 )
Branches     : 100% ( 1143/1143 )
Functions    : 100% ( 412/412 )
Lines        : 100% ( 1475/1475 )
  153 passed (38.4s)
VERIFY_RC=0
```

### TDD の記録

コードの変更なし（`docker-compose.yml` の設定と文書だけ。`.claude/rules/tdd.md` の「設定のファイル」は対象の外）。直す前の失敗は、上の表の「直す前」の行。

## コードレビュー

- 判定: APPROVE（2 回目）　範囲: `bcc8f2d~1..b6c7e7d`（`docker-compose.yml`、`docs/architecture/environments.md`）　レビューした sub agent: code-reviewer（opus）

| # | 回 | 重さ | 指摘 | 確かめた結果 | 対応 |
|---|---|---|---|---|---|
| 1 | 1（CHANGES_REQUESTED） | major | `environments.md` の `setup-local.sh` の行に、まだ無い `scripts/storage-cors.mjs` と CORS の手順（#25 の作業）が入っている | その通り。作業ツリーの #25 の行を一緒に commit していた | 直した `b6c7e7d`（#49 の commit からその句を外した。#25 の行は作業ツリーに残し、#25 と一緒に commit する） |
| 2 | 2（APPROVE） | minor | 外したあと、文の終わりが「埋め。」になり、元の「埋める。」に戻っていない | その通り | 直した `0c34b6e` |

レビュー 2 で「`docs/log.md` に `environments.md` の変更の行が無い」とも添えられた（指摘にはしない、とあった）。`6f0348b` で足した。

## ブラウザでの確認

| URL | 幅 | テーマ | した操作 | 見えた結果 | 画面の写真 |
|---|---|---|---|---|---|
| `/home` | 1280 / 768 / 375 | ライト | データベースを作り直したあと、ログインして開いた | タイムラインがいつも通り出る | `home-*.jpg` |

- コンソール: エラー 0、警告 0　通信: 失敗 0（`chrome-evidence.mjs` の 3 回の読み込み）
- CI の実行のページ: 全部の仕事が成功

![ホーム（1280px）](evidence/issue-0049-postgres-connections/home-1280.jpg)
![ホーム（768px）](evidence/issue-0049-postgres-connections/home-768.jpg)
![ホーム（375px）](evidence/issue-0049-postgres-connections/home-375.jpg)

## 見つけた問題

1. **根本原因:** 画面のテストは 3 つのブラウザを並列に動かし、サーバーはリクエストごとに小さな接続の pool を作る（ADR-0037）ので、同時のリクエストが既定の `max_connections` 100 を超えた。本番は Hyperdrive が接続をまとめるので、上限はローカルと CI だけの設定
2. 直したあと 1 回目の `pnpm verify` で、WebKit のフォローのテストの移動の割り込みを見つけた。#50 として起票して直した（[#50 の試験レポート](issue-0050-follow-test-wait.md)）
