---
type: TestReport
title: "試験レポート: データベースの表・マイグレーション・シードがあり、`getDb()` と ID が使える"
description: "#16 で、データモデルの全ての表・制約・索引、getDb、時刻の順の ID、ワーカーごとのテストのデータベース、シードを TDD で作り、本物の PostgreSQL と CI で確かめた記録。"
tags: [test-report, database, schema]
status: stable
---

# 試験レポート: データベースの表・マイグレーション・シードがあり、`getDb()` と ID が使える

## 対象

- issue: [#16](https://github.com/ohta-rh/x-modoki-v2/issues/16)
- commit: `9c62318`・`9e089a3`・`867aefd`（ブランチ `m1/local-app`、PR #40）
- CI: [実行 44234799248](https://github.com/ohta-rh/x-modoki-v2/actions/runs/44234799248)（成功）
- 日付: 2026-11-18

## 環境

- OS: macOS 26.2、Google Chrome 157.0.8103.79
- Node.js: 手元は 26.12.0（`.nvmrc` は 24。CI の結果を本当の結果とする）、pnpm 12.19.0
- データベース: PostgreSQL 18.7（Docker Compose、`127.0.0.1:54320`）。テストは、ひな形 `xmodoki_test` から作るワーカーごとのデータベース
- 動かし方: `pnpm db:migrate` → `pnpm db:seed`、アプリは `pnpm build && pnpm start -p 3300`

## 判定

合格 — 受け入れ条件 7 件のうち 7 件を満たした。外部キーの消し方と、新しい順の索引の向きを [ADR-0034](../adr/0034-foreign-keys-cascade-from-users-and-detach-thread-links.md) に記録した。

## 受け入れ条件ごとの結果

| # | 条件 | 確かめ方 | 結果 | エビデンス |
|---|---|---|---|---|
| 1 | データモデルの 2 節の全ての表・制約、3 節の全ての索引がある（Better Auth の表は #10 の形） | `pnpm db:migrate` のあと、カタログ（`pg_tables`・`pg_indexes`・`pg_constraint`・`information_schema.columns`）を文書から書いた期待と比べるテスト | 合格（15 の表、16 の索引、制約 49、全ての列） | 「自動のテスト」 |
| 2 | `drizzle/` に SQL があり、まっさらなデータベースに `pnpm db:migrate` が通り、`pg_trgm` をマイグレーションが作る | テストの準備が、毎回まっさらなひな形に流す。`drizzle-kit generate` が「No schema changes」 | 合格 | 「自動のテスト」 |
| 3 | `getDb()` がリクエストごとに接続を作り、同じリクエストでは 1 つ、モジュールの一番上で作らない | `client.test.ts`、`grep -rn "new Pool" src` | 合格（`new Pool` は `getDb` の中の 1 か所だけ） | 「自動のテスト」 |
| 4 | `newId()` が時刻の順の 64 bit、`toIdString`・`parseId` が 1〜19 桁と行き来する、基準は 2026-01-01 | `id.test.ts`（時刻と乱数を渡す、桁あふれ、不正な文字列） | 合格 | 「自動のテスト」 |
| 5 | 自分をフォローできない、同じ投稿を 2 回リポストできない、リポストは本文が空 | 本物の PostgreSQL に対するテスト | 合格 | 「自動のテスト」 |
| 6 | `pnpm db:seed` が架空の 20 人・投稿 300 件・フォロー・いいねを入れる | 開発のデータベースに流して数えた。2 回目は何も入れない | 合格（20・300・100・450） | 下の出力 |
| 7 | ワーカーごとのデータベース、テストの前に表を空にする仕組み、テストデータを作る関数がある | `test/db.test.ts` | 合格 | 「自動のテスト」 |

```
$ pnpm db:seed
seed: 20 users, 300 posts, 100 follows, 450 likes
$ pnpm db:seed
seed: the database already has users; nothing inserted
 users | posts | follows | likes
-------+-------+---------+-------
    20 |   300 |     100 |   450
```

## 自動のテスト

```
docs check passed: 72 file(s)
src layers check passed
All matched files use Prettier code style!
 Test Files  14 passed (14)
      Tests  198 passed (198)
Statements   : 100% ( 423/423 )
Branches     : 100% ( 265/265 )
Functions    : 100% ( 71/71 )
Lines        : 100% ( 364/364 )
  6 passed (2.6s)
VERIFY_RC=0
```

- Playwright: Chromium・Firefox・WebKit で各 2（この PBI で画面は変わらない。隣の画面の確認）

### TDD の記録

| # | 振る舞い | 先に書いたテスト | 赤（落ちた理由） | 緑にした実装 |
|---|---|---|---|---|
| 1 | あとに作った ID のほうが大きい | `id.test.ts` › あとに作った ID のほうが大きい | `TypeError: newId is not a function` | `src/shared/lib/id/id.ts` |
| 2 | 乱数を渡さなければ `crypto.getRandomValues` の 22 bit | 同 › 乱数を渡さなければ… | `expected 0n to be 4194303n` | 同 |
| 3 | ビット配置と、時刻の既定（実装が先に満たしていた） | 同 › 上の 41 bit が… / 時刻を渡さなければ… | 実装を壊して確かめた: `expected 2n to be 5n`、`expected -7412281402982400000n to be 4194304000n` | 同 |
| 4 | `toIdString` と `parseId`（桁あふれ・不正な文字列は null） | 同 › toIdString と parseId | `TypeError: parseId is not a function` ほか 10 件 | 同 |
| 5 | 自分をフォローすると制約で拒まれる | `schema.test.ts` | CHECK を外したマイグレーションで `promise resolved "Result{ command: 'INSERT', …}" instead of rejecting` | `schema/posts.ts`・`drizzle/0001_initial_schema.sql` |
| 6 | 新しい順の索引が `DESC` で並べ替えに使える形 | 同 › 索引の `it.each` | `expected 'CREATE INDEX posts_author_id_idx ON p…' to contain 'btree (author_id, id DESC)'`（6 件。Drizzle の `.desc()` が `NULLS LAST` を付けた） | `.desc().nullsFirst()`、ADR-0034 |
| 7 | リポストの 2 つの制約 | 同 › 2 回リポスト / リポストが%sと… | 制約を外したマイグレーションで 4 件が落ちた | 同 |
| 8 | `getDb()` が問い合わせられ、同じリクエストで 1 つ、応答のあとで閉じる | `client.test.ts` | `Error: not implemented`（3 件） | `src/shared/db/client.ts` |
| 9 | テストどうしがデータを見ない | `test/db.test.ts` | `beforeEach(resetDb)` を外して `expected 1 to be +0` | `test/db.ts` |
| 10 | シード（件数・架空の名前・数の列・ID の順・2 回目は何もしない・コマンド） | `scripts/seed.test.ts` | `TypeError: log is not a function`（6 件）、`expected +0 to be 20` | `scripts/seed.ts`・`scripts/db-seed.ts` |
| 11 | 全ての列と制約（外部キーの消し方も）が文書のとおり（レビュー 1 回目） | `schema.test.ts` › 列と制約が… | NULLS NOT DISTINCT を外す・`reply_to_id` を CASCADE にする・列の名前を変える、の 3 つでそれぞれ落ちた | — （テストを足した） |

- `src/shared/db/client.ts` は、テストより先に書いてしまった。脇に退けてスタブで赤を見てから戻した。厳密には「先に書いたコードは消して書き直す」に反する
- 表の宣言（`src/shared/db/schema/`）と生成した SQL は TDD の対象の外（`.claude/rules/tdd.md`）。振る舞いは上の 5〜7・11 で、実装を壊して落ちるのを見てから確かめた
- `getDb` のテストは、`next/server` の `after` と React の `cache` を差し替えた。どちらも Next.js のリクエストの外では動かないため。リクエストの中での振る舞いは、データを読む最初の画面の PBI（#19）の Playwright で確かめる

## コードレビュー

- 判定: APPROVE（2 回目）　範囲: `origin/m1/local-app...HEAD`　レビューした sub agent: code-reviewer（opus）

| # | 回 | 重さ | 指摘 | 確かめた結果 | 対応 |
|---|---|---|---|---|---|
| 1 | 1 | major | 受け入れ条件 1 のテストが、表の名前と索引しか見ていない。列・2 節の制約・ADR-0034 の外部キーの消し方を壊しても通る | 再現した（NULLS NOT DISTINCT・`reply_to_id` の消し方・列の名前を変えても通った） | 直した `9e089a3`。テスト: `schema.test.ts` › 列と制約が… |
| 2 | 2 | minor | `data-model.md` のユーザーの検索の索引の式が、実装（`coalesce(username, '')`）と違う。文書のとおりに問い合わせると索引が使われない | 再現した | 直した `867aefd`（レビュアーの示した直し方のとおり） |

## ブラウザでの確認

この PBI には、データベースを使う画面も URL もまだ無い（最初は #18・#19）。完了の定義の表の「サーバーだけの変更」に従い、本番のビルドが壊れずに開くこと、無い URL の扱い、コンソールを確かめた。データベースの中身は、上の `psql` の出力で確かめた。

| URL | 幅 | テーマ | した操作 | 見えた結果 | 画面の写真 |
|---|---|---|---|---|---|
| `http://localhost:3300/` | 1280・768・375 | ライト（テーマはまだ無い） | 開いた | 見出し「x-modoki」。`innerWidth` が幅のとおり、横のスクロールなし | 下の 4 枚 |
| `http://localhost:3300/api/does-not-exist` | 1280 | 同 | 無い URL を開いた（失敗の経路） | 404 のページ | — |

![1280px の /](evidence/issue-0016-schema-and-seed/landing-1280.jpg)

![768px の /](evidence/issue-0016-schema-and-seed/landing-768.jpg)

![375px の /](evidence/issue-0016-schema-and-seed/landing-375.jpg)

![Claude in Chrome で見た /](evidence/issue-0016-schema-and-seed/chrome-landing.jpg)

- コンソール: エラー 0、警告 0　通信: 失敗 0

## 見つけた問題

1. **新しい順の索引が並べ替えに使われない形だった（テストで見つけた）。** 根本原因: Drizzle の `.desc()` は `DESC NULLS LAST` を出し、PostgreSQL の `ORDER BY … DESC` の既定（`NULLS FIRST`）と合わない。6 つの索引を `.desc().nullsFirst()` にし、ADR-0034 に書いた
2. **`useTestDb` という名前で lint が落ちた。** 根本原因: `use` で始まる名前を、ESLint が React のフックとして扱う。`setupTestDb` にし、テストの設計の文書に書いた
3. **`db-seed.ts` の `.env.local` が無いときの枝を、テストが通らなかった。** 枝を無くし、`package.json` の `db:seed` で `node --env-file-if-exists=.env.local` を渡すようにした
