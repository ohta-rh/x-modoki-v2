---
type: ADR
title: "ADR-0014: 見た目は Tailwind CSS 4 で書き、動きのある部品は shadcn/ui（Base UI）をリポジトリに取り込んで使う"
description: "スタイルは Tailwind CSS 4 と CSS の変数で書き、ダイアログやメニューなどの部品は shadcn/ui の Base UI 版をリポジトリに取り込み、アイコンは Lucide を使う。"
tags: [ui, styling]
status: stable
---

# ADR-0014: 見た目は Tailwind CSS 4 で書き、動きのある部品は shadcn/ui（Base UI）をリポジトリに取り込んで使う

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断）
- 関連: [Next.js と周辺ツールチェーンの現状](../research/nextjs.md)、[UI/UX 仕様](../architecture/ui-ux.md)、ADR-0009

## 背景

X の見た目に合わせるには、幅・余白・色・角を 1px の単位で決められることが要る（ADR-0009）。ダイアログ・メニュー・ホバーのカード・タブ・トーストは、フォーカスの扱いとキーボード操作を正しく作るのが難しい。

2026-11-18 に確認した事実: `tailwindcss` の `latest` は 4.3.5 で、`create-next-app` の既定に入っている。shadcn/ui は 2026 年 7 月から Base UI を既定の土台にしている（Radix も引き続き使える）。`@base-ui/react` は 1.9.0、`shadcn` の CLI は 4.23.0、`lucide-react` は 1.74.0。

## 決定

- **スタイルは Tailwind CSS 4。** 色・角・幅は CSS の変数（`@theme`）で持ち、テーマは `<html data-theme>` で替える
- **動きのある部品（ダイアログ・メニュー・ポップオーバー・ツールチップ・タブ・トースト）は、shadcn/ui の Base UI 版を CLI でリポジトリに取り込む。** 取り込んだコードは `src/components/ui/` に置き、X の見た目に合わせて書き換える
- 投稿カード・タイムライン・入力欄など、このアプリに固有の部品は自分で書く
- アイコンは Lucide。選んでいる状態は、塗りつぶしの版か太さで表す
- 絵文字の選択、画像の切り抜きなど、土台に無い部品は、要るときに 1 つずつ選ぶ
- 見た目が決まった部品のライブラリ（MUI・Chakra UI・Mantine など）は使わない
- CSS-in-JS（styled-components・Emotion）は使わない

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| Tailwind 4 と shadcn/ui（Base UI）（採用） | コードが手元にあり、見た目を全部決められる。フォーカスとキーボードは土台が受け持つ。今の既定 | 取り込んだコードは自分で保つ |
| Tailwind 4 と shadcn/ui（Radix） | 情報が多い | shadcn の新しい部品は Base UI を先に出す |
| Tailwind だけで全部書く | 依存が少ない | フォーカスの閉じ込めやキーボード操作を自分で作り、間違えやすい |
| MUI・Chakra UI・Mantine | 部品が揃っている | 見た目を X に合わせるために、上書きを大量に書く |
| CSS Modules | 素の CSS | 値を揃える仕組みを自分で作る |

## 結果

- 色と幅は変数の 1 か所で決まり、テーマとアクセントの切り替えが変数の差し替えで済む
- Base UI では、子の要素に振る舞いを渡す書き方が `asChild` ではなく `render` になる
- 取り込んだ部品に上流の修正を当てるときは、差分を見て手で入れる
