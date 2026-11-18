---
type: ADR
title: "ADR-0030: Steiger の 2 つの決まりを範囲を絞って止め、`src/` の直下の層と、クライアントからのサーバーの読み込みは自前の確認で守る"
description: "Steiger の `typo-in-layer-name`（`_app`・`_pages` だけ）と `insignificant-slice` を止め、`src/` の直下に 6 つの層のほかを置かないことはスクリプトで、`'use client'` のファイルからサーバー専用のものを読まないことは ESLint のローカルの決まりで守る。"
tags: [architecture, fsd, lint]
status: stable
---

# ADR-0030: Steiger の 2 つの決まりを範囲を絞って止め、`src/` の直下の層と、クライアントからのサーバーの読み込みは自前の確認で守る

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: ADR-0022（守らせ方の節を、この ADR で置き換え）、[FSD の構成を Next.js 16.4 で動かした結果](../research/fsd-on-next-16.md)

## 背景

ADR-0022 は、FSD の構成を Steiger（`fsd` の推奨の設定）と ESLint の `no-restricted-imports` で守らせると決めた。#12 で、捨てる場所のアプリに入れて確かめたところ、次のことが分かった。

- Steiger 0.10.0 の `fsd/typo-in-layer-name` は、FSD の Next.js の案内が勧める `_app` と `_pages` を「`app` の打ち間違い」として落とす。Steiger の土台は先頭のアンダースコアを層として扱っており、落とすのはこの決まりだけ
- `fsd/insignificant-slice` は、ほかの 1 つのスライスだけから使われるスライスを落とす。PBI を 1 つずつ足していく間は、ほとんどのスライスがこれに当たる
- Steiger は、`src/` の直下に層でないフォルダ（`src/components`）があっても、打ち間違い（`src/entites`）があっても、何も言わない
- ESLint の `no-restricted-imports` は、ファイルが `'use client'` かどうかを見分けられない。「クライアントのファイルから `index.server` を読まない」は、この決まりでは書けない
- 上の向きの読み込み（`fsd/forbidden-imports`）と、公開 API を通らない読み込み（`fsd/no-public-api-sidestep`）は、Steiger が落とした

## 決定

- **Steiger の `fsd/typo-in-layer-name` を、`./src/_app/**` と `./src/_pages/**` だけで止める。** ほかの層では効いたままにする
- **Steiger の `fsd/insignificant-slice` を止める。** 1 つのスライスからしか使われないことは、このアプリでは誤りではない
- **`src/` の直下に、6 つの層（`_app`・`_pages`・`widgets`・`features`・`entities`・`shared`）のほかを置かないことは、`scripts/check-src-layers.mjs` で確かめる。** `pnpm lint` から動かし、CI で落とす。このスクリプトにもテストを書く（ADR-0026）
- **`'use client'` のファイルから、`index.server`・`server-only`・`@/shared/db` を読むことは、ESLint のローカルの決まり `local/no-server-import-in-client`（`eslint-rules/`）で落とす。** テストを書く
- `@/shared/db` を `api` セグメントのほかから読むこと、ルートの `app/` から `_pages`・`_app` 以外を読むこと、`sharp` と `fs` を読むことは、ADR-0022 のとおり `no-restricted-imports` で落とす
- `_app` のセグメントの名前は、Steiger の `segments-by-purpose` に合わせて、目的で付ける。Provider は `_app/entrypoint/` に置く（`providers` は中身の種類の名前なので落ちた）。セグメントの中に `ui` という名前のフォルダを作らない（`no-reserved-folder-names`）
- 止めた決まりは、`steiger.config.ts` に、理由を 1 行で書く

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| 2 つの決まりを範囲を絞って止め、足りないところを自前で確かめる（採用） | Steiger の残りの決まりがそのまま効く。抜けていた 2 つを確かめられる | スクリプトとローカルの決まりを自分で保つ |
| `typo-in-layer-name` を全体で止める | 設定が短い | `src/entites` のような本物の打ち間違いも見逃す（今の版はもともと見逃すが、直ったときに効かせたい） |
| 層の名前を `app`・`pages` にする | Steiger がそのまま通る | Next.js の `app`・`pages` と同じ名前になり、FSD の案内にも反する |
| `eslint-plugin-boundaries` に替える | 依存の向きを細かく書ける | FSD の決まり（公開 API・セグメント）を自分で全部書くことになる。Steiger で足りている |
| クライアントからの読み込みを `server-only` のビルドのエラーだけで止める | 足すものが無い | `next build` まで分からない。lint の段で止めたい |

## 結果

- `pnpm lint` は、ESLint・Steiger・`check-src-layers.mjs` の 3 つを動かす
- `src/` に新しいフォルダを作ると、層でなければ lint が落ちる
- Steiger を上げたときは、止めた 2 つの決まりが今も要るかを確かめる
- [アプリケーションの構造](../architecture/application-structure.md) と `.claude/rules/architecture-fsd.md` の `_app/providers` を `_app/entrypoint` に直した
