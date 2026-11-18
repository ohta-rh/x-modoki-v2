---
type: ADR
title: "ADR-0043: ブラウザが WebP を書けないときは、同じ品質の JPEG で送り、サーバーは JPEG も受け付ける"
description: "Safari（WebKit）の Canvas は WebP を書けず PNG を返すので、そのブラウザでは品質 0.85 の JPEG で送り、署名・先頭のバイトの確認は WebP・GIF・JPEG の 3 つを受け付け、確認には先頭の 1KB を読む。"
tags: [storage, media, browser]
status: stable
---

# ADR-0043: ブラウザが WebP を書けないときは、同じ品質の JPEG で送り、サーバーは JPEG も受け付ける

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: [ADR-0018](0018-resize-images-in-browser.md)（WebP にできないブラウザの扱いをこの ADR で置き換え）、ADR-0008、[脅威の文書](../architecture/threat-model.md) の T-07、#25

## 背景

- ADR-0018 は、画像を送る前にブラウザで WebP（品質 0.85）にすると決めた。WebP にできないブラウザのことは書いていない
- 2026-11-18 に Playwright の 3 つのブラウザで `canvas.toBlob(…, 'image/webp', 0.85)` を確かめた。Chromium 158 と Firefox 159 は `image/webp` を返し、**WebKit 27.2 は `image/png` を返した**（WebP を書けない）。WebKit は Safari のエンジンなので、Safari の利用者は画像を投稿できなかった（#25 の画面のテストが WebKit で落ちて見つかった）
- PNG のままにすると大きく、署名の 5MB を超えやすい。WebP を書く WebAssembly の部品は、数百 KB の依存が増える
- JPEG の縦横は、先頭の 32 バイトではなく、量子化表のあとの SOF のマーカーにある（Canvas の出力で 150 バイト前後）

## 決定

- **ブラウザでは、まず WebP（品質 0.85）を求め、返ってきたものが WebP でなければ JPEG（品質 0.85）を求める。** どちらでもなければ、その画像は送らない
- **署名（`POST /api/uploads/presign`）が受け付ける種類は `image/webp`・`image/gif`・`image/jpeg`。** キーの拡張子は `webp`・`gif`・`jpg`
- **結びつけるときは、置かれたものの先頭の 1KB を読み**、JPEG は SOF のマーカー（`0xC0`〜`0xC3`）まで読み進めて縦横を確かめる。1KB の中にマーカーが無い JPEG は拒む
- ほかは ADR-0018 のまま（長辺 2048px、アバター 400×400、バナー 1500×500、GIF はそのまま、サーバーでは変換しない）

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
|---|---|---|
| **WebP にできなければ JPEG（採用）** | 依存が増えない。JPEG はどのブラウザも書ける。大きさも WebP に近い | 種類が 1 つ増え、確認の読み取りが 1KB になる |
| PNG のまま送る | 確認が簡単 | 写真では大きく、5MB を超えやすい。PNG を許すと T-07 の守りが緩む |
| WebAssembly の WebP の符号化（`@jsquash/webp` など） | どのブラウザでも WebP | 数百 KB の依存。読み込みと変換が遅い |
| Safari では画像を投稿できないままにする | 何もしない | 利用者の多くを締め出す |

## 結果

- 良くなること: Safari でも画像を投稿できる
- 受け入れる負担: 保存される画像に JPEG が混ざる。確認の読み取りが 32 バイトから 1KB になる
- 守ること: 受け付ける種類を増やすときは、先頭のバイトでの確認（`sniffImage`）を同じ変更で足し、偽った中身を拒むテストを書く
