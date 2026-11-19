---
type: ADR
title: "ADR-0061: 全ての応答にセキュリティのヘッダーを付け、CSP は自分のサイト・画像の配信元・ストレージの口だけを許し、インラインのスクリプトは許す"
description: "T-17 の対策として next.config.ts から全ての応答に CSP・nosniff・DENY・Referrer-Policy を付け、Next.js が前もって作る画面へ流すインラインのスクリプトには nonce が届かないので、script-src に 'unsafe-inline' を残す。"
tags: [security, headers, csp]
status: stable
---

# ADR-0061: 全ての応答にセキュリティのヘッダーを付け、CSP は自分のサイト・画像の配信元・ストレージの口だけを許し、インラインのスクリプトは許す

- ステータス: 採用
- 日付: 2026-11-19
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: #33、NFR-SEC-09、T-17（[脅威の洗い出し](../architecture/threat-model.md)）、ADR-0008（画像は別のオリジン）、ADR-0021（Cache Components）

## 背景

- 2026-11-19 の時点で、応答にセキュリティのヘッダーが 1 つも無かった（`e2e/security-headers.spec.ts` が赤）
- 画像は別のオリジン（Garage、ADR-0008）から出し、画像そのものはブラウザから署名つき URL でストレージの口へ直接 PUT する（#25）。投稿の前の下見は `blob:` の URL
- Next.js 16.4.6 は、Cache Components（ADR-0021）で画面の殻を前もって作り、残りをインラインのスクリプトで流して差し込む。要求ごとの nonce は、前もって作った殻のスクリプトには付けられない。nonce を使うには、全ての画面を要求のたびに描く必要がある
- 投稿の本文は React の文字として出し、HTML にしない（T-05）。XSS の主な守りはこれ

## 決定

- **全ての応答（画面と API）に 4 つのヘッダーを付ける。** `next.config.ts` の `headers()` から、`src/shared/config/security-headers.ts` の組み立てを使う
  - `Content-Security-Policy`: `default-src 'self'`、`img-src 'self' blob: data: <画像の配信元>`、`connect-src 'self' <ストレージの口>`、`object-src 'none'`、`base-uri 'self'`、`form-action 'self'`、`frame-ancestors 'none'`
  - `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy: strict-origin-when-cross-origin`
- **`script-src` と `style-src` は `'self' 'unsafe-inline'`。** 開発のサーバーだけ `'unsafe-eval'` を足す
- ストレージの口は、パス形式ならその口のオリジン、そうでなければバケットのサブドメイン（`uploadOrigin`）

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| **`'unsafe-inline'` を残した CSP（採用）** | 前もって作る殻（ADR-0021）と流す描画がそのまま動く。外のサイトのスクリプト・枠に入れること・`object` は止まる | インラインのスクリプトの差し込みは CSP では止まらない（React の文字の出し方に頼る） |
| 要求ごとの nonce | インラインのスクリプトも止まる | 全ての画面を要求のたびに描くことになり、Cache Components と速さの予算（#32）を捨てる |
| ハッシュ | 前もって作れる | 流して差し込むスクリプトは中身が毎回違い、ハッシュを決められない |
| CSP を付けない | 手間が無い | T-17 の対策が無いまま |

## 結果

- 良くなること: 枠への埋め込み（クリックジャッキング）、MIME の推測、外のオリジンからのスクリプト・画像・通信が止まる。画像の配信元とストレージの口だけが外のオリジンとして許される
- 受け入れる負担: インラインのスクリプトの差し込みは CSP では止まらない。T-05（本文を HTML にしない）と `dangerouslySetInnerHTML` を使わないことが、その分の守り
- 守ること: 外のオリジンを足すとき（マイルストーン 2 の R2 など）は、この組み立てに足し、`e2e/security-headers.spec.ts` を通す。Next.js が殻へ nonce を付けられるようになったら、この決定を見直す
