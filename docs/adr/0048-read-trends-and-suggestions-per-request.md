---
type: ADR
title: "ADR-0048: トレンドとおすすめのユーザーは 'use cache' で持たず、要求ごとに読む"
description: "'use cache' の読み取りをレイアウトと /explore で使うと、Chromium のページがいつまでも通信の途切れた状態にならなかったので、M1 ではトレンドとおすすめのユーザーを connection() のあとで要求ごとに読む。"
tags: [caching, performance, nextjs]
status: stable
---

# ADR-0048: トレンドとおすすめのユーザーは 'use cache' で持たず、要求ごとに読む

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: [ADR-0010](0010-dal-server-actions-route-handlers.md)（「誰が見ても同じ読み取りは `'use cache'`」をこの ADR で置き換え）、#27

## 背景

- ADR-0010 は、誰が見ても同じ読み取り（トレンド、おすすめのユーザー）を `'use cache'`・`cacheLife`・`cacheTag` で持つと決めた。#27 で、このリポジトリで初めて `'use cache'` を使った（Next.js 16.4.6、Cache Components）
- `'use cache'` の 2 つの読み取りを、レイアウト（右サイドバー）と `/explore` で使うと、画面のテスト `app-shell.spec.ts` ›「/home を開くと、コンソールのエラーと失敗した通信が 0」が、**Chromium だけ**で毎回 `waitForLoadState('networkidle')` の 30 秒で止まった。Firefox と WebKit は通った
- 2026-11-18 の切り分け（Chromium、同じテストを 2〜4 回ずつ、ビルドし直して）:

| 変えたもの | 結果 |
|---|---|
| #27 の変更を全部退かす | 通る |
| 右サイドバーの中身・`loadSidebar`・`/explore`・`/search` のどれか 1 つを戻す | 落ちる |
| `/explore` と `/search` を戻し、`loadSidebar` も呼ばない | 通る |
| `/explore` と `/search` を戻し、`loadSidebar` は呼ぶ | 落ちる |
| `cacheLife('minutes')` を `'hours'` にする | 落ちる |
| `'use cache'` をやめ、`connection()` のあとで要求ごとに読む | 通る |

- トレースには終わっていない要求が残らず、Next.js の中で何が通信を続けているかは確かめられていない

## 決定

- **トレンドとおすすめのユーザーは `'use cache'` を使わず、要求ごとに読む。** 読み込み（`loadSidebar`・`loadExplorePage`）は `connection()` のあとで読む（プリレンダーの中で読まない）
- ADR-0010 のほかの決定（データアクセス層・Server Action・Route Handler）は変えない
- `'use cache'` を使い直すときは、上のテストが Chromium で通ることを先に確かめる

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
|---|---|---|
| **要求ごとに読む（採用）** | 3 つのブラウザで通る。仕組みが簡単 | 毎回 2 つの問い合わせ（直近 24 時間のハッシュタグの集計、上位 20 人）。M1 のデータの量では軽い |
| `'use cache'` のまま、テストの `networkidle` をやめる | キャッシュが効く | 確認を弱めることになる（`.claude/rules/quality-gates.md`）。Chromium で通信が途切れない理由が分からないまま残る |
| Next.js の中を調べて直す | 根本が分かる | 時間の見込みが立たない。M1 の範囲の外 |

## 結果

- 良くなること: 右サイドバーと `/explore` が、3 つのブラウザで画面のテストを通る
- 受け入れる負担: トレンドとおすすめのユーザーを、ページを開くたびに読む
- 守ること: 上の画面のテストを弱めない。利用者が増えて読み取りが重くなったら、Chromium での振る舞いを確かめたうえでキャッシュを入れ直す（新しい ADR で）
