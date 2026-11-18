---
type: ADR
title: "ADR-0035: shadcn の部品は CLI を使わずレジストリの定義から取り込み、トーストは Base UI 版にする"
description: "shadcn の Base UI 版の部品は、レジストリの JSON を読んで import とアイコンを書き換えて src/shared/ui/kit に置き、トーストは sonner ではなく Base UI の Toast を使い、Tailwind のアクセントの色の名前は brand にする。"
tags: [ui, toolchain]
status: stable
---

# ADR-0035: shadcn の部品は CLI を使わずレジストリの定義から取り込み、トーストは Base UI 版にする

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: ADR-0014（取り込み方を補う）、ADR-0022、ADR-0032、#17

## 背景

ADR-0014 は、動きのある部品を「shadcn/ui の Base UI 版を CLI でリポジトリに取り込む」と決めた。#17 で確かめると、次のことが分かった（shadcn 4.23.0、2026-11-18）。

- `shadcn init` は `components.json` を作り、`package.json` に依存を足し、CSS を書き換える。足す依存の版は、ADR-0032 の 7 日の決まりを通らないことがある
- Base UI 版の部品の定義は、レジストリ（`https://ui.shadcn.com/r/styles/base-nova/<名前>.json`）にある。中身は、import の別名（`cn`・`@/registry/...`）と、アイコンの差し込み口（`IconPlaceholder`）を CLI が書き換える前の形
- shadcn の `sonner`（トースト）は、`sonner` と `next-themes` に頼る。Base UI には自前の `Toast` があり、レジストリの `toast` はそれを使う
- shadcn の部品は色の名前 `accent` を「ホバーの背景」の意味で使う。UI/UX 仕様の `--accent` は X のアクセントの色（`#1D9BF0`）

## 決定

- **shadcn の部品は、CLI を使わず、レジストリの JSON を読んで取り込む。** `cn` を `@/shared/lib/cn` に、`@/registry/base-nova/ui/button` を同じフォルダの `./button` に、`IconPlaceholder` を Lucide のアイコンに書き換え、`src/shared/ui/kit/` に置く。先頭に取り込んだ日と出どころを書く
- 取り込んだのは `button`・`dialog`・`dropdown-menu`・`tooltip`・`tabs`・`toast`（2026-11-18）。足すときも同じ方法で取り込む
- **トーストは Base UI の `Toast`（レジストリの `toast`）を使う。** `sonner` と `next-themes` は入れない。テーマは `<html data-theme>` が持つ（ADR-0014）
- **Tailwind の色の名前では、X のアクセントの色を `brand` と呼ぶ**（`bg-brand`・`text-brand`）。CSS の変数は UI/UX 仕様のまま `--accent`。shadcn の名前（`background`・`foreground`・`muted`・`accent`・`ring` など）は、`@theme inline` で自前の変数に結びつける
- 部品のテストの照合に `@testing-library/jest-dom` を使う（`toHaveAttribute` など。`test/setup.ts` で読み込む）

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| レジストリの JSON から書き換えて取り込む（採用） | 依存と CSS を勝手に変えられない。取り込む中身を読んでから置ける | 書き換えを自分で行う。CLI の更新の仕組みを使えない |
| `shadcn init` と `shadcn add` | 公式の手順 | 7 日より新しい版の依存を足しうる。CSS と設定を書き換える |
| トーストに `sonner` | shadcn の既定 | 依存が 2 つ増え、テーマの仕組みが 2 つになる |
| アクセントを Tailwind でも `accent` と呼ぶ | 仕様と同じ名前 | shadcn の部品の `accent`（ホバーの背景）とぶつかる |

## 結果

- `src/shared/ui/kit/` はカバレッジの外（ADR-0021）。見た目はそこで直してよいが、振る舞いは変えない
- 部品を足すときは、レジストリの JSON を読んで同じ書き換えをする
- 色を使うときは、アクセントは `brand`、線は `line`、弱い文字は `text-muted` を使う
