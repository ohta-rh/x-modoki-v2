---
type: ADR
title: "ADR-0005: 開発の道具は Node.js 24・pnpm 12・TypeScript 6.0・ESLint 10 とし、TypeScript 7 は見送る"
description: "Node.js 24 LTS・pnpm 12・TypeScript 6.0.x・ESLint 10 と eslint-config-next・Prettier を使い、TypeScript 7 は typescript-eslint が対応するまで使わない。"
tags: [toolchain, typescript, lint]
status: stable
---

# ADR-0005: 開発の道具は Node.js 24・pnpm 12・TypeScript 6.0・ESLint 10 とし、TypeScript 7 は見送る

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断）
- 関連: [Next.js と周辺ツールチェーンの現状](../research/nextjs.md)、ADR-0004、ADR-0013

## 背景

2026-11-18 に npm レジストリで確認した事実:

- `typescript` の `latest` は 7.0.2（Go で書き直された版。JS のコンパイラ API が無い）。6 系の最新は 6.0.3
- `typescript-eslint` 8.73.0 の peer は `typescript >=4.8.4 <6.1.0`。`eslint-config-next/typescript` はこれを使うので、TypeScript 7 とは入らない
- `eslint` の `latest` は 10.15.0。`eslint-config-next` は 16.4.0 から ESLint 10 に対応
- `vitest` 5.1.0 の `engines` は `^22.12.0 || ^24.0.0 || >=26.0.0`。`next` は `>=20.9.0`
- `pnpm` の `latest` は 12.21.0

Next.js 16 で `next lint` は削除された。lint は ESLint か Biome を直接動かす。

## 決定

- Node.js は 24 LTS。`.nvmrc` と `package.json` の `engines` に書く
- パッケージの管理は pnpm 12。`package.json` の `packageManager` で版を固定する。npm と yarn は使わない
- **TypeScript は 6.0.x を使う。TypeScript 7 は使わない。** `strict` を有効にし、パスの別名は `paths`（`@/*`）だけで書く（`baseUrl` は TypeScript 7 でエラーになるので使わない）
- lint は ESLint 10 と `eslint-config-next`（`core-web-vitals` と `typescript`）。flat config（`eslint.config.mjs`）で書く
- 整形は Prettier 3 と `prettier-plugin-tailwindcss`。ESLint には `eslint-config-prettier` を入れ、整形の規則を ESLint に持たせない
- typescript-eslint が TypeScript 7 に対応したら、新しい ADR で上げる

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| TypeScript 6.0 と ESLint 10 と eslint-config-next（採用） | Next.js の公式の組み合わせ。peer の範囲が合う。Next.js と React 向けの規則が全部使える | TypeScript が最新ではない。後で 7 に上げる作業が残る |
| TypeScript 7 と Biome | 最新で、型の確認と lint が速い。typescript-eslint が要らない | Biome の Next.js・React 向けの規則がどこまで揃っているか確認できていない。TypeScript の API を使う道具が動かない恐れがある |
| TypeScript 7 と ESLint（lint だけ 6 を別名で入れる） | 型の確認は最新 | 確認できていない回避策。TypeScript が 2 つ入る |
| Node.js 22 LTS | Vitest と ESLint の条件は満たす | 24 より先に保守が終わる |

## 結果

- 公式の手順どおりに入り、peer の警告が出ない
- TypeScript 7 の速さは得られない。7 で消える書き方（`baseUrl`、`moduleResolution: node`）は最初から使わないので、上げるときの直しは小さい
- 版は `package.json` で固定し、上げるときは 1 つずつ上げて全部の確認（型・lint・テスト・ビルド）を通す
