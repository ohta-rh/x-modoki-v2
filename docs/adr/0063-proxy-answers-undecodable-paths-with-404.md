---
type: ADR
title: "ADR-0063: 解読できない % を含むパスは、proxy.ts で 404 の画面へ書き換える"
description: "動的なセグメントに解読できない % の並びが入ると Next.js が素の 500 を返すので、proxy.ts の matcher に % を含むパスを足し、解読できなければ /404 へ書き換え、ログインが要るかは proxy の中の正規表現で見分ける。"
tags: [routing, proxy, error]
status: stable
---

# ADR-0063: 解読できない % を含むパスは、proxy.ts で 404 の画面へ書き換える

- ステータス: 採用
- 日付: 2026-11-19
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: #73、#34、ADR-0010、ADR-0017

## 背景

- `/%ZZ`・`/x/status/%ZZ`・`/api/posts/%ZZ/view` は素の「Internal Server Error」（500）を返した。動的でない `/home/%ZZ` は 404（2026-11-19、#73）
- Next.js 16.4.6 は動的なセグメントの引数の解読で `DecodeError` を投げ、400 の画面（`/400`）を描こうとするが、App Router には無いので 500 になる（`node_modules/next/dist/server/base-server.js`・`router-server.js`）
- 使い捨ての試しで、`proxy.ts` は Next.js の解読より前に、生のパスを受け取ることを確かめた
- それまで `proxy.ts` は、ログインが要る画面だけを matcher で選び、ログインへ送るだけだった（`.claude/rules/architecture-fsd.md`）

## 決定

- **`config.matcher` に `'/:path(.*%.*)'`（`%` を含むパス）を足す。** `proxy` は最初に `decodeURIComponent(pathname)` を試し、投げたら `/404` へ書き換える（`NextResponse.rewrite`）。ほかの無い URL と同じ 404 の画面になる
- **ログインが要るかは、matcher と同じ形の正規表現 `NEEDS_LOGIN` で、proxy の中でも見分ける。** `%` を含む公開の画面（`/%E3%81%82` など）がログインへ送られないようにするため。両者が食い違わないことは `proxy.test.ts` が、全部の形を並べて確かめる
- `proxy.ts` の役目は「ログインへ送る粗い門」と「解読できないパスを 404 にする」の 2 つ。ほかの判断は足さない

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| **proxy で解読を試し、/404 へ書き換える（採用）** | Next.js の外の手だけで直る。正しい URL には何もしない | proxy が `%` を含む全部のパスで動く。ログインの判定を正規表現でも持つ |
| proxy で 400 の素の応答を返す | 書き換えが要らない | アプリの画面にならず、素の文字だけが出る |
| Next.js を直す（patch） | 根元で直る | 依存を書き換えて保つ手間。版を上げるたびに確かめ直す |
| そのままにする | 手間が無い | 手で打った URL で、壊れたような 500 が出続ける |

## 結果

- 良くなること: 壊れた URL でも 404 の画面になり、500 の記録が出ない
- 受け入れる負担: `%` を含むパスの全部で proxy が動く。ログインが要る画面を足すときは、matcher と `NEEDS_LOGIN` の両方に足す
- 守ること: Next.js が `DecodeError` を自分で 400 の画面にできるようになったら、この書き換えを外す
