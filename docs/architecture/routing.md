---
type: Architecture
title: "ルーティング"
description: "URL の一覧、App Router のディレクトリの形、モーダルになるルート、使えないユーザー名を示す。"
tags: [architecture, routing, nextjs]
status: stable
---

# ルーティング

- 決定: [ADR-0004](../adr/0004-nextjs-16-all-in-one-app.md)、[ADR-0009](../adr/0009-mimic-x-ui-with-own-brand.md)
- URL の形は X の Web 版に合わせる（出典: [X の Web UI/UX 調査](../research/x-uiux.md)）

## 1. URL の一覧

| URL | 画面 | ログイン | 開き方 |
|---|---|---|---|
| `/` | ログインしていないときの入口。ログインしていれば `/home` へ送る | 不要 | ページ |
| `/i/flow/login` | ログイン | 不要 | ページ（中央にカードを出す。3 カラムの骨格は出さない） |
| `/i/flow/signup` | 登録 | 不要 | ページ（同じ） |
| `/home` | タイムライン（おすすめ / フォロー中） | 必要 | ページ |
| `/explore` | 話題を検索（トレンド・おすすめのユーザー） | 必要 | ページ |
| `/search?q=&f=` | 検索の結果。`f` は無し（話題）・`live`（最新）・`user`・`media` | 必要 | ページ |
| `/notifications` | 通知（すべて） | 必要 | ページ |
| `/notifications/mentions` | 通知（メンション） | 必要 | ページ |
| `/i/bookmarks` | ブックマーク | 必要 | ページ |
| `/compose/post` | 投稿の入力 | 必要 | モーダル |
| `/settings` と `/settings/account`・`/settings/display` | 設定 | 必要 | ページ（2 ペイン） |
| `/settings/profile` | プロフィールの編集 | 必要 | モーダル |
| `/{username}` | プロフィール（ポスト） | 不要 | ページ |
| `/{username}/with_replies` | プロフィール（返信） | 不要 | ページ |
| `/{username}/media` | プロフィール（メディア） | 不要 | ページ |
| `/{username}/likes` | プロフィール（いいね）。本人だけ | 必要 | ページ |
| `/{username}/following`・`/{username}/followers` | フォロー中とフォロワーの一覧 | 不要 | ページ |
| `/{username}/status/{id}` | 投稿の詳細と返信 | 不要 | ページ |
| `/{username}/status/{id}/photo/{n}` | 画像のビューア（`n` は 1 から） | 不要 | モーダル |

「モーダル」のルートは、アプリの中から開くと前の画面の上に重なり、URL を直接開く・再読み込みするとページとして出る。

## 2. ディレクトリの形

```
src/app/
├── layout.tsx                         <html data-theme>、フォント、Provider
├── page.tsx                           /（入口）
├── not-found.tsx / error.tsx
├── i/flow/
│   ├── login/page.tsx                 /i/flow/login（直接開いたとき）
│   └── signup/page.tsx
├── (main)/                            3 カラムの骨格を持つグループ
│   ├── layout.tsx                     { children, modal } を受ける
│   ├── default.tsx
│   ├── @modal/
│   │   ├── default.tsx                null を返す（必須）
│   │   ├── (.)compose/post/page.tsx
│   │   ├── (.)settings/profile/page.tsx
│   │   └── (.)[username]/status/[postId]/photo/[index]/page.tsx
│   ├── home/page.tsx
│   ├── explore/page.tsx
│   ├── search/page.tsx
│   ├── notifications/
│   │   ├── page.tsx
│   │   └── mentions/page.tsx
│   ├── i/bookmarks/page.tsx
│   ├── compose/post/page.tsx          直接開いたとき
│   ├── settings/
│   │   ├── layout.tsx                 2 ペイン
│   │   ├── page.tsx
│   │   ├── account/page.tsx
│   │   ├── display/page.tsx
│   │   └── profile/page.tsx           直接開いたとき
│   └── [username]/
│       ├── layout.tsx                 バナー・プロフィール・タブ
│       ├── page.tsx
│       ├── with_replies/page.tsx
│       ├── media/page.tsx
│       ├── likes/page.tsx
│       ├── following/page.tsx
│       ├── followers/page.tsx
│       └── status/[postId]/
│           ├── page.tsx
│           └── photo/[index]/page.tsx 直接開いたとき（詳細の上にビューア）
└── api/
    ├── auth/[...all]/route.ts
    ├── timeline/…/route.ts
    ├── users/[username]/posts/route.ts
    ├── posts/[postId]/replies/route.ts
    ├── search/route.ts
    ├── notifications/…/route.ts
    ├── bookmarks/route.ts
    ├── uploads/presign/route.ts
    ├── cron/cleanup-media/route.ts
    └── health/route.ts
```

API の一覧は [アプリケーションの構造](application-structure.md) の 5 節。

## 3. 守ること

| 規則 | 理由 |
|---|---|
| `@modal` のスロットに `default.tsx` を置く | Next.js 16 では、無いとビルドが失敗する |
| モーダルのルートは、重ねる版（`@modal/(.)…`）と、直接開いたときの版（通常の `page.tsx`）の両方を作る。中身の部品は同じものを使う | 再読み込みと URL の共有で同じ内容が出る |
| モーダルを閉じるのは `router.back()` | 前の画面のスクロールの位置が残る |
| `params` と `searchParams` は必ず `await` する。型は `PageProps<'/…'>` を使う | Next.js 16 で同期の読み方は削除された |
| リンクは `typedRoutes` で型を確かめる | 存在しない URL へのリンクをビルドで見つける |
| `/{username}/status/{id}` の `username` が投稿の作者と違うときは、正しい URL へ送る | 同じ投稿の URL を 1 つにする |
| ログインが要る画面の確認は、`proxy.ts` でログインへ送ることと、データアクセス層での確認の両方で行う | `proxy.ts` だけでは守れない（[ADR-0010](../adr/0010-dal-server-actions-route-handlers.md)） |

## 4. 使えないユーザー名

`/{username}` は一番上の階層にあるので、固定のルートと同じ名前のユーザーを作れないようにする。登録と変更のときに、Zod のスキーマで弾く。

```
home explore search notifications messages i compose settings api
login logout signup about help privacy terms tos
_next static favicon.ico robots.txt sitemap.xml manifest.webmanifest
admin root system support official x twitter modoki
```

ユーザー名は、英数字とアンダースコアの 4〜15 文字。大文字と小文字を区別せずに一意にする。
