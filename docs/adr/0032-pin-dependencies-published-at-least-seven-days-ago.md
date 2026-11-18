---
type: ADR
title: "ADR-0032: 依存は、公開から 7 日以上たった版に固定し、pnpm の新しい版の除外を使わない"
description: "全ての依存を、公開から 7 日以上たった版に正確に固定し、`pnpm-workspace.yaml` の `minimumReleaseAgeExclude` を使わず、build のスクリプトは `allowBuilds` で 1 つずつ許す。"
tags: [toolchain, security, dependencies]
status: stable
---

# ADR-0032: 依存は、公開から 7 日以上たった版に固定し、pnpm の新しい版の除外を使わない

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: ADR-0005、ADR-0020、[FSD の構成を Next.js 16.4 で動かした結果](../research/fsd-on-next-16.md) の 3.7

## 背景

#12 の調査で、pnpm 12 が、公開の翌日の `@tanstack/react-query@5.108.0` を入れるときに、`pnpm-workspace.yaml` の `minimumReleaseAgeExclude` へ自分でその版を書き足した。pnpm 12 は、公開から日の浅い版を入れない仕組みを持つ。npm の依存を乗っ取られる事件は、公開から数日のうちに見つかって取り下げられることが多い。

pnpm 12 は、依存の build のスクリプト（`postinstall` など）も、許したものだけを動かす（#10 の調査の 3.5）。

## 決定

- **全ての依存（`dependencies` と `devDependencies`）を、`package.json` に正確な版で書く**（`^` や `~` を付けない）
- **版は、公開から 7 日以上たったものの中で、いちばん新しいものを選ぶ。** 7 日たっていない版が要るときは、7 日たつのを待つ
- **`pnpm-workspace.yaml` に `minimumReleaseAgeExclude` を書かない。** pnpm が自分で書き足したら、その版をやめて、7 日たった版に替える
- 依存の build のスクリプトは、`pnpm-workspace.yaml` の `allowBuilds` で 1 つずつ許す。今は `esbuild` と `unrs-resolver`。Next.js の任意の依存の `sharp` は許さない（`images.unoptimized` で使わない。ADR-0008・ADR-0018）
- `pnpm install --frozen-lockfile` を CI で使い、ロックファイルに無い版を入れない
- 依存の更新の PR（#37）も、公開から 7 日以上たった版だけを提案する設定にする

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| 7 日以上たった版に正確に固定（採用） | 乗っ取られた版を入れる前に、世の中が見つける時間がある。入る版が毎回同じ | 最新の修正が 7 日遅れる |
| 出たら最新を入れ、除外を書く | すぐ最新になる | 乗っ取られた版を入れる危険がある。pnpm の守りを自分で外す |
| `^` で範囲を書く | 更新の手間が少ない | 入る版が、いつ入れたかで変わる |
| 30 日にする | もっと安全 | セキュリティの修正が遅れすぎる |

## 結果

- 2026-11-18 の時点で、`@tanstack/react-query` は 5.108.0 ではなく 5.107.1、`eslint` は 10.15.0 ではなく 10.14.0 など、いくつかが 1 つ前の版になる（[技術スタック](../architecture/tech-stack.md)）
- 版を上げるときは、公開の日を `npm view <名前> time` で確かめる
- 脆弱性の修正が 7 日たつ前に要るときは、この ADR を置き換える ADR を書いてから入れる
