---
type: ADR
title: "ADR-0065: ブラウザからの Server Action の呼び出しは必ず失敗を受け、ESLint の自前のルールで止める"
description: "通信の失敗で Server Action の Promise が投げると、画面が誤りの画面に変わるか黙って失敗するので、クライアントの呼び出しは settle・catch・then の失敗の受け手・mutationFn のどれかで受け、受けない形を local/settle-server-actions が止める。"
tags: [reliability, offline, lint, server-actions]
status: stable
---

# ADR-0065: ブラウザからの Server Action の呼び出しは必ず失敗を受け、ESLint の自前のルールで止める

- ステータス: 採用
- 日付: 2026-11-19
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: #70、#82、#34、ADR-0062

## 背景

- 通信が切れていると、ブラウザから呼んだ Server Action の Promise は `TypeError: Failed to fetch` で投げる。受けなければ、トランジションの中では画面全体が誤りの画面に変わり、そうでなければ黙って失敗する
- #70 で 10 か所を `settle`（`src/shared/lib/settle`）で包んだが、3 巡目の探索的テストで、ログイン・登録・ログアウトが漏れていた（#82）。同じ種類の 2 回目
- Server Action は `_pages` からクライアントの部品へ props で渡り、名前は `action`・`〜Action`・`signOut`（ADR-0010、`.claude/rules/architecture-fsd.md`）

## 決定

- **`'use client'` のファイルで Server Action を呼ぶときは、必ず失敗を受ける。** 受け方は `settle(action(…), 失敗の結果)`、`.catch(…)`、`.then(成功, 失敗)`、TanStack Query の `mutationFn` の中（`onError` が受ける）のどれか。呼び出しをそのまま `return` する・矢印関数の本体にするのは、その関数そのものが Server Action の名前（`action={…}` の JSX の属性やプロパティ、`sendAction` などの変数や関数）を持つときだけ、呼び手に任せる形として許す。その関数の呼び出しを、このルールが確かめる。名前の無い関数（ほかの関数の引数やイベントの受け手）で返すのは許さない
- **`useActionState` に Server Action をそのまま渡さない。** 包んで `settle` する
- 失敗したときの文言は `OFFLINE_MESSAGE`（「通信できませんでした。もう一度お試しください」）
- **`redirect` は失敗ではない。** Next.js 16.4.6 は、`redirect` する Server Action の Promise を、移動のための誤りで拒む（`server-action-reducer.js`）。`settle` と `.catch` の受け手は、まず `unstable_rethrow(error)`（`next/navigation`）で投げ直してから、失敗として扱う
- **ESLint の自前のルール `local/settle-server-actions`（`eslint-rules/index.mjs`）がこれを止める。** `action`・`signOut`・`〜Action` という名前の関数を Server Action とみなす。Server Action でない手元の関数には、この名前を付けない

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| **名前で見分ける ESLint のルール（採用）** | `pnpm lint` で止まる。型の情報が要らず速い | 名前の決まりに頼る。決まりに合わない名前の Server Action は見逃す |
| 型の情報を使う ESLint のルール | 名前によらない | 型の情報つきの lint は遅く、設定が増える |
| 全部の画面を通信を切って回る Playwright のテスト | 振る舞いで確かめる | 全部の操作を並べるのが重く、新しい操作の書き忘れは止まらない |
| ルールの文書に書くだけ | 手間が無い | #70 のあとにも漏れた |

## 結果

- 良くなること: 新しい Server Action の呼び出しで失敗を受け忘れると、lint で止まる。入れたときに、詳細の画面のいいね（`run` が受けていた）なども含めて全部を確かめた
- 受け入れる負担: Server Action でない関数に `〜Action` の名前を付けられない（`post-card.tsx` の `ownAction` を `isOwnControl` にした）
- 守ること: Server Action を props で渡すときは、この名前の決まりに合わせる
