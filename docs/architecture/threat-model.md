---
type: Design
title: "脅威の洗い出し"
description: "守るものと入口ごとに、想定する脅威・対策・それを確かめるテストを STRIDE で並べ、対策の無い脅威の扱いを決める。"
tags: [security, design]
status: stable
---

# 脅威の洗い出し

- 要件: [機能でない要件](../requirements/non-functional.md) の安全性（NFR-SEC-01〜11）
- 規則: [アプリケーションの構造](application-structure.md) の 6 節
- 土台: Next.js の同梱の文書 `02-guides/data-security.md`（Server Action は URL を知らなくても直接 POST で呼べる、など）
- 分類: STRIDE（なりすまし S・改ざん T・否認 R・情報の漏れ I・サービスの妨害 D・権限の昇格 E）
- 「確かめるテスト」の列は、実装の PBI で書くテストの名前の形。#33 で、実際のテストの名前と突き合わせる

## 1. 守るもの

| 守るもの | 中身 | 漏れたり変えられたりすると |
|---|---|---|
| アカウント | ユーザー名・メールアドレス・パスワードのハッシュ | なりすまし、メールアドレスの漏れ |
| セッション | `better-auth.session_token` の cookie と `session` の行 | 他人として操作される |
| 投稿 | 本文・画像・いいね・フォロー・通知 | 他人の投稿を消される・書き換えられる、利用者を騙すリンク |
| 画像 | ストレージの物 | 画像でないもの（HTML・スクリプト）を配られる、容量を使い切られる |

## 2. 入口

| 入口 | 例 | 誰でも届くか |
|---|---|---|
| Server Action | `likePost`・`createPost`・`deletePost`・`updateProfile` | 届く（ページを知らなくても、直接 POST できる） |
| Route Handler | `GET /api/timeline/*`・`POST /api/uploads/presign`・`/api/auth/*`・`POST /api/cron/cleanup-media` | 届く |
| 署名つき URL | ストレージへの PUT | URL を知っている人なら届く（60 秒） |
| `proxy.ts` | ログインへの転送 | 届く。ただし門は粗く、認可の役はしない |
| ページ | `/home`・`/{username}`・`/i/flow/login?next=…` | 届く |

## 3. 脅威と対策

| # | STRIDE | 入口 | 脅威 | 対策 | 要件 | 確かめるテスト | PBI |
|---|---|---|---|---|---|---|---|
| T-01 | E | Server Action | **他人の投稿の削除・固定・編集（IDOR）**。投稿の ID を書き換えて送る | 変更の関数は、`api` セグメントで、セッションの利用者と投稿の作者を比べる。違えば `FORBIDDEN` | NFR-SEC-01 | 変更の関数ごとに「他人は `FORBIDDEN`、データが変わらない」 | #20・#23 ほか |
| T-02 | S・E | Server Action | **Server Action への直接の POST**。画面を通さず、ログインせずに呼ぶ | 全ての Server Action が、最初にセッションを確かめる。`proxy.ts` に頼らない | NFR-SEC-01 | 変更の関数ごとに「ログインしていなければ `UNAUTHORIZED`」 | #18〜#29 |
| T-03 | S | セッション | **セッションの盗用**。スクリプトから cookie を読む | cookie は `HttpOnly`・`SameSite=Lax`、本番は `Secure`。本文を HTML にしない（T-05） | NFR-SEC-04 | 「ログインの応答の cookie に `HttpOnly` と `SameSite=Lax` がある」 | #18 |
| T-04 | S | セッション | **セッションの固定**。攻撃者が用意したトークンで被害者をログインさせる | ログインのたびに Better Auth が新しいトークンを作る。外から渡されたトークンを使わない | NFR-SEC-04 | 「ログインの前後でセッションのトークンが変わる」 | #18 |
| T-05 | T・E | 投稿の本文 | **本文での XSS**。`<script>` や `<img onerror>` を投稿する | 本文は React の文字として出す。`dangerouslySetInnerHTML` を使わない。リンクは `twitter-text` で取り出した部分だけを `<a>` にする | NFR-SEC-06 | 「`<script>alert(1)</script>` の本文は文字のまま出る」 | #19 |
| T-06 | T | 投稿の本文・プロフィールのリンク | **`javascript:` などのリンク** | リンクにするのは `http`・`https` の URL だけ。プロフィールの URL も Zod で `http`・`https` に限る | NFR-SEC-06 | 「`javascript:alert(1)` はリンクにならない」「プロフィールの URL に `javascript:` は拒まれる」 | #19・#23 |
| T-07 | T | 署名つき URL・画像 | **画像を装ったファイル**。HTML や SVG を `image/webp` と申告して置く | 署名の前に種類（`image/webp`・`image/gif`、WebP を書けないブラウザでは `image/jpeg`: ADR-0043）と大きさを確かめる。結びつけるときに、ブラウザに渡していないキーへ写し、その写しの先頭のバイトで種類と縦横を確かめる（署名つき URL は 60 秒有効なので、元のキーは確かめたあとでも上書きできる）。画像はアプリと別のドメインから出す | NFR-SEC-07 | 「PNG を `image/webp` と申告すると結びつけを拒む」「HTML の中身は拒む」「投稿したあと元のキーを上書きしても、投稿の画像は変わらない」 | #25 |
| T-08 | T・D | 署名つき URL | **署名つき URL の使い回し**。同じ URL で何度も上書き・別の中身を置く | 期限は 60 秒。キーは推測できない乱数。大きさを署名に入れる。結びつけるのは `pending` の 1 回だけ。他人のキーは結びつけられない | NFR-SEC-07 | 「署名より大きい PUT は 403」「期限切れは拒まれる」「他人のキーは結びつけを拒む」 | #25 |
| T-09 | S | 登録 | **ユーザー名のなりすまし**。予約の語（`home`・`settings`・`x`）や、大文字と小文字だけ違う名前 | 予約の語を Zod で拒む。ユーザー名は小文字にそろえて一意にする | FR-AUTH-02・03 | 「`settings` は拒まれる」「`Taro` があるとき `taro` は拒まれる」 | #18 |
| T-10 | D | ログイン・投稿・フォロー・署名 | **回数の制限の回避**。総当たりのログイン、大量の投稿 | `rate_limits` の表で、キー（IP・利用者）と時間の区切りで数える。サーバーの中のメモリに頼らない | NFR-SEC-05 | 「11 回目のログインは `RATE_LIMITED`」ほか | #18・#19・#24・#25 |
| T-11 | T・E | Server Action・Route Handler | **CSRF**。別のサイトから、利用者のブラウザに操作を送らせる | Server Action は Next.js が `Origin` と `Host` を比べる。cookie は `SameSite=Lax`。状態を変える Route Handler は `POST` だけで、`Origin` を確かめる | NFR-SEC-04 | 「別の `Origin` からの `POST /api/uploads/presign` は 403」 | #25・#33 |
| T-12 | S | ログイン | **開いた転送**。`/i/flow/login?next=https://evil.test` で、ログインのあと外へ送る | `next` は `/` で始まり `//` で始まらない、同じサイトの中のパスだけを受け付ける | NFR-SEC-10 | 「`next=https://evil.test` と `next=//evil.test` は `/home` へ」 | #18 |
| T-13 | I | Route Handler・Server Action | **内部の列の漏れ**。パスワードのハッシュ・メールアドレス・セッションのトークンを応答に含める | データアクセス層は DTO だけを返す。DTO の型にその列が無い | NFR-SEC-03 | 「タイムラインの応答に `email` と `password` が無い」 | #19 ほか・#33 |
| T-14 | E | `GET /api/notifications` ほか | **他人のデータを読む**。他人の通知・いいねの一覧・下書き | 読み取りの関数も、セッションの利用者のものだけを返す | NFR-SEC-01 | 「他人の通知は読めない」「他人の『いいね』のタブは `FORBIDDEN`」 | #23・#26 |
| T-15 | E | `POST /api/cron/cleanup-media` | **定期的な処理を誰でも呼ぶ** | 秘密の値（`CRON_SECRET`）を確かめる。違えば 401 | NFR-SEC-01 | 「秘密の値が違えば 401」 | #25 |
| T-16 | I | リポジトリ | **秘密の値の漏れ** | 秘密の値は環境変数だけ。`.env*` をリポジトリに入れない。`NEXT_PUBLIC_` は公開してよい値だけ | NFR-SEC-08 | 「`env.ts` は足りない変数で落ちる」、リポジトリの検索 | #15・#33 |
| T-17 | T | ブラウザ | **クリックジャッキング・スクリプトの差し込み** | `Content-Security-Policy`・`X-Frame-Options: DENY`・`X-Content-Type-Options: nosniff`・`Referrer-Policy` | NFR-SEC-09 | 「応答に 4 つのヘッダーがある」 | #33 |
| T-18 | D | 依存 | **脆弱な依存** | `pnpm audit --prod --audit-level high` を CI で動かす。依存の更新を自動の PR にする | NFR-SEC-11 | CI の確認 | #33・#37 |
| T-19 | D | 投稿・画像 | **容量を使い切られる**。結びつけない画像を大量に置く | 署名に回数の制限。結びつかなかった画像を 1 日に 1 回消す | NFR-SEC-05 | 「24 時間より古い `pending` の画像は消える」 | #25 |
| T-20 | R | 全部 | **操作を否認される**（「自分は消していない」） | 受け入れる（下の 4 節） | — | — | — |
| T-21 | T | `/api/auth/*` | **使っていない書き込みの道からの改ざん**。`update-user` で名前の検証を超える、`image` に他人の画像のキーを入れて消させる | アプリが使わない Better Auth の書き込みの道は閉じる（ADR-0045）。置き換えた画像は、自分の行だけを消す | NFR-SEC-01・03 | 「`/update-user` は 404」「前のアバターが他人の画像を指していても消さない」 | #51・#25 |

## 4. 対策を入れない脅威と、その理由

| 脅威 | 理由 | 見直す時 |
|---|---|---|
| T-20 否認（操作の記録・監査のログが無い） | 学習用のアプリで、利用者の間の争いを裁く仕組みは範囲の外（[機能の範囲](scope.md) の 3 節、管理者の画面と通報） | 誰でも登録できる形で公開する前 |
| 大量のアカウントの作成（ボット） | メールの確認と CAPTCHA は範囲の外（機能の範囲の 2 節）。ローカルで動かすマイルストーン 1 には、外からの利用者がいない | マイルストーン 2（Cloudflare の Turnstile や WAF を検討する） |
| 分散した攻撃（DDoS） | ローカルでは起きない。本番は Cloudflare の前段が受ける | マイルストーン 2 |

## 5. この文書の使い方

- 実装の PBI は、自分の入口に関わる行の「確かめるテスト」を、TDD で書く
- 新しい入口（Route Handler・Server Action・ストレージへの道）を足すときは、この表に行を足す
- #33 で、全ての行の「確かめるテスト」を、実際のテストのファイルと名前に置き換える
