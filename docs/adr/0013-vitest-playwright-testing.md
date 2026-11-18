---
type: ADR
title: "ADR-0013: 単体のテストは Vitest、画面を通したテストは Playwright で行い、データアクセス層は本物の PostgreSQL で試す"
description: "関数と同期のコンポーネントは Vitest 5、非同期の Server Component を含む画面の流れは Playwright で試し、データアクセス層のテストは本物の PostgreSQL に対して行う。"
tags: [testing, quality]
status: stable
---

# ADR-0013: 単体のテストは Vitest、画面を通したテストは Playwright で行い、データアクセス層は本物の PostgreSQL で試す

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断）
- 関連: [Next.js と周辺ツールチェーンの現状](../research/nextjs.md)、ADR-0005、ADR-0010

## 背景

Next.js の公式のテストの案内は、Vitest と Jest を単体のテスト、Playwright と Cypress を画面を通したテストとして挙げている。同じ案内は、Vitest が非同期の Server Component を扱えないこと、非同期のコンポーネントは画面を通したテストで試すことを書いている。

このアプリで間違えると困るのは、認可（データアクセス層）、カーソルのページング、数の増減、文字数の数え方。前の 3 つは SQL の振る舞いそのもので、データベースを偽物にすると確かめられない。

2026-11-18 に npm レジストリで確認した版: `vitest` 5.1.0、`@playwright/test` 1.65.1、`@testing-library/react` 16.3.3。

## 決定

- **単体のテストは Vitest 5。** 対象は、純粋な関数（文字数、時刻と数の整形、ID の生成、Zod のスキーマ）と、同期のクライアントのコンポーネント（React Testing Library と jsdom）
- **データアクセス層と Server Action のテストは、Vitest から本物の PostgreSQL に対して行う。** Docker Compose のテスト用のデータベースを使い、テストごとにトランザクションを戻す。Drizzle を偽物にしない
- **画面を通したテストは Playwright。** 対象は、非同期の Server Component を含むページ、モーダルになる URL、無限スクロール、登録から投稿までの流れ
- 非同期の Server Component を Vitest で試さない
- Jest と Cypress は使わない
- 「全部通った」と言えるのは、型の確認・lint・Vitest・Playwright・`next build` の全部が通ったとき

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| Vitest と Playwright、データアクセス層は本物の PostgreSQL（採用） | 公式の案内どおり。SQL と認可を本物で確かめられる | テストに Docker が要る。偽物より遅い |
| Jest | 利用の例が多い | 設定が重い。ESM と TypeScript で手間がかかる |
| Drizzle を偽物にする | 速い。Docker が要らない | ページング・一意の制約・トランザクションの間違いを見つけられない |
| 画面を通したテストだけ | 利用者の見え方で確かめられる | 遅い。認可の場合分けを網羅しにくい |
| Cypress | 画面で確かめやすい | Playwright のほうが並列と複数のブラウザに強い |

## 結果

- 認可の間違いと SQL の間違いを、画面を作る前に見つけられる
- テストを動かすには、Docker Compose のデータベースが立ち上がっている必要がある
- Playwright は時間がかかるので、最初の失敗で止める設定（`--max-failures`）にする
