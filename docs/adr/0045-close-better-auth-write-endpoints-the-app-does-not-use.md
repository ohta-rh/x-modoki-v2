---
type: ADR
title: "ADR-0045: Better Auth の HTTP の道のうち、アプリが使わない利用者の書き込みは閉じる"
description: "update-user・change-email・change-password・delete-user は、プロフィールの編集の検証と画像の持ち主の確認を素通りできるので disabledPaths で閉じ、利用者の行はアプリの検証のある Server Action だけで変える。"
tags: [auth, security]
status: stable
---

# ADR-0045: Better Auth の HTTP の道のうち、アプリが使わない利用者の書き込みは閉じる

- ステータス: 採用
- 日付: 2026-11-18
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた）
- 関連: [ADR-0007](0007-better-auth-db-sessions.md)（Better Auth）、[脅威の文書](../architecture/threat-model.md) の T-09・T-10・T-21、#51、#25

## 背景

- `app/api/auth/[...all]` は Better Auth のすべての HTTP の道を通す。閉じていたのは、登録とログインの 3 つだけだった（T-09・T-10。検証と回数の制限のある Server Action で行うため）
- `POST /api/auth/update-user` は、本文の `name`・`image` をそのまま `users` に書く（`node_modules/better-auth/dist/api/routes/update-user.mjs`、1.7.20、2026-11-18 に確かめた）。プロフィールの編集の検証（名前 50 文字まで・リンクは http(s)）を素通りでき、`image` に他人の画像のキーを入れられる
- #25 のコードレビューで、`image` に他人のキーを入れてからアバターを保存すると、他人の画像が消える道が見つかった。#25 の中では、消すのを自分の行だけにして直した。道そのものは #51 で閉じる
- アプリは、ログアウトとセッションの読み取り以外に Better Auth の HTTP の道を使わない。登録・ログイン・ログアウトはサーバーの中から `getAuth().api.*` を呼ぶ。Better Auth の `disabledPaths` は HTTP の道だけを閉じ、サーバーの中からの呼び出しは閉じない

## 決定

- **Better Auth の HTTP の道のうち、利用者の行を書き換え、アプリが使わないものは `disabledPaths` で閉じる。** 今は `/update-user`・`/change-email`・`/change-password`・`/delete-user`
- **利用者の行は、アプリの検証のある Server Action だけで変える**（プロフィールの編集: `features/profile-edit`）
- 閉じた道ごとに、`src/_app/api-routes/auth.test.ts` に「404 で、何も変わらない」テストを置く
- Better Auth の版を上げるときは、増えた道を確かめ、書き込みの道があれば同じ変更で閉じる

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
|---|---|---|
| **使わない書き込みの道を disabledPaths で閉じる（採用）** | 1 か所の設定。サーバーの中の呼び出しは変わらない | 道の名前を並べて持つ。版を上げたときに見直しが要る |
| `[...all]` で通す道を許す名前だけにする | 新しい道が勝手に開かない | Better Auth の内部の道（セッションの更新など）を知って並べる必要があり、壊しやすい |
| 道は開けたまま、`users` への書き込みの前に hook で検証する | 道の名前に頼らない | 検証が 2 か所に分かれる。画像の持ち主の確認まで hook に入れるのは重い |

## 結果

- 良くなること: プロフィールと画像は、検証と持ち主の確認のある編集からしか変えられない
- 受け入れる負担: Better Auth の版を上げるたびに、HTTP の道の一覧を確かめる
- 守ること: 利用者の行を書き換える Better Auth の道を使うときは、この ADR を置き換え、検証の場所を決めてから開ける
