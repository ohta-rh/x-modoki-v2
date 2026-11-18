---
type: ADR
title: "ADR-0051: テーマとアクセントの色は、ルートのレイアウトではなく head の小さなスクリプトで html に付ける"
description: "Cache Components ではルートのレイアウトで cookie を読むと全部のページが prerender できなくなるので、テーマとアクセントの色は cookie に持ち、head の先頭のインラインのスクリプトが最初の描画の前に html の data-theme と data-accent に付ける。"
tags: [theme, nextjs, cache-components]
status: stable
---

# ADR-0051: テーマとアクセントの色は、ルートのレイアウトではなく head の小さなスクリプトで html に付ける

- ステータス: 採用
- 日付: 2026-11-19
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: #29、ADR-0014（デザイントークン）

## 背景

- #29 の実装方針は「テーマは cookie にも持ち、`app/layout.tsx` が `<html data-theme>` に出す（ちらつきを防ぐ）」だった
- 2026-11-19 に試した: `app/layout.tsx` で `await cookies()` を読むと、`next build`（Next.js 16.4.6、Cache Components）が `Route "/search": Next.js encountered uncached or runtime data during prerendering … cookies() … accessed outside of <Suspense>` で止まる。`<html>` は `<Suspense>` に入れられず、避ける道は各ルートを `instant = false`（待たせる）にすることだけ
- 全部のページを待たせると、Cache Components の静かな殻（ADR-0016）をやめることになる

## 決定

- **テーマ（`light` / `dim` / `dark`）とアクセントの色（6 つ）は、データベース（`users.theme` / `users.accent`）と cookie の両方に持つ**
- **`app/layout.tsx` の `<head>` の先頭に、cookie を読んで `<html>` の `data-theme` と `data-accent` を付ける小さなインラインのスクリプトを置く。** 描画を止めて動くので、最初の描画から選んだ見た目になる（ちらつかない）。`<html>` は `suppressHydrationWarning` を付ける（サーバーの値 `light` と違うため）
- ルートのレイアウトでは cookie を読まない

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| **head のスクリプト（採用）** | 全部のページが prerender のまま。最初の描画から正しい | JavaScript を止めているとテーマが既定（light）になる |
| ルートのレイアウトで cookie を読み、各ルートを `instant = false` | サーバーの HTML がそのまま正しい | 全部のページが待たされ、Cache Components の利点を失う |
| 読み込んだあとにクライアントで付ける（`useEffect`） | 簡単 | 一瞬 light が見える（ちらつく） |

## 結果

- 良くなること: 見た目の設定が、prerender を壊さずに最初の描画から効く
- 受け入れる負担: スクリプトを止めた利用者には既定の見た目になる。`<html>` の属性の食い違いを `suppressHydrationWarning` で許す
- 守ること: ルートのレイアウトで cookie・headers を読まない。スクリプトは cookie の値を決まった選択肢と照らしてから付ける（それ以外は無視する）
