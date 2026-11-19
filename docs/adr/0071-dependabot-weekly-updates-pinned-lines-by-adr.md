---
type: ADR
title: "ADR-0071: 依存の更新は Dependabot が週に 1 回 PR にし、ADR が固定した系列は ADR でだけ上げる"
description: "Dependabot で npm と GitHub Actions を週に 1 回調べ、パッチとマイナーは 1 つの PR にまとめ、メジャーは 1 つずつにし、ADR が版の系列を固定した Next.js 16.4・React 19.3・TypeScript 6.0・Node.js 24・Drizzle 0.45 は、系列を外れる更新の PR を作らない。"
tags: [process, dependencies, security]
status: stable
---

# ADR-0071: 依存の更新は Dependabot が週に 1 回 PR にし、ADR が固定した系列は ADR でだけ上げる

- ステータス: 採用
- 日付: 2026-11-20
- 決定者: エージェント（委任された判断。ADR-0028 によりユーザーに聞かずに決めた。Dependabot を使うことは #37 の実装方針）
- 関連: #37、ADR-0004、ADR-0005、ADR-0006、ADR-0070

## 背景

- 依存の版は `package.json` で固定してあるが、新しい版と脆弱性を知らせる仕組みが無い（`.github/dependabot.yml` が無い、2026-11-20）
- Next.js は月ごとにセキュリティのリリースがあり、ADR-0004 は「パッチは出たら上げる」と決めている
- ADR が版の系列を固定したものがある: Next.js 16.4 系と React 19.3 系（ADR-0004）、TypeScript 6.0 系と Node.js 24（ADR-0005）、Drizzle ORM 0.45 系と drizzle-kit 0.31 系（ADR-0006）
- #37 は、外のサービスが要らない Dependabot を選ぶと決めている

## 決定

- `.github/dependabot.yml` で、npm と GitHub Actions を週に 1 回調べる
- パッチとマイナーは、生態系ごとに 1 つの PR（`minor-and-patch` のグループ）にまとめる。メジャーはグループに入れず、1 つずつの PR にする
- ADR が固定した系列は、それを外れる更新の PR を作らない。`@types/node` はメジャーを、`next`・`react`・`react-dom`・`@types/react`・`@types/react-dom`・`typescript`・`drizzle-orm`・`drizzle-kit` はメジャーとマイナーを無視する（系列がマイナーで決まっているため）。`@playwright/test` と `playwright` は、全部の更新を無視する: 版がそのまま CI と `docker-compose.yml` の Playwright のイメージの名前（`v1.65.0-noble`）でもあり、3 つを同じ変更で手で動かす（ADR-0046、ADR-0047）設定のそれぞれに、理由の ADR の番号を注で書く
- PR の扱い: パッチとマイナーの PR は、CI が緑で、Chrome でアプリを見て問題が無ければ取り込む。メジャーは ADR を書いてから取り込む。固定した系列を動かすときは、その ADR を置き換える ADR を書き、設定の無視を外す
- 自動のマージはしない

## 検討した選択肢

| 選択肢 | 長所 | 短所 |
|---|---|---|
| **Dependabot（採用）** | GitHub に入っていて、外のサービスもアカウントも要らない | グループの書き方が Renovate より少ない |
| Renovate | 細かく書ける | 外のアプリを入れることになる（#37 の範囲の外） |
| 毎日調べる | 早く気づく | PR が多すぎる。セキュリティの更新は Dependabot の別の仕組みで日をまたがず来る |
| 全部を 1 つずつの PR | 1 つずつ確かめられる | 週に十数本の PR になり、読まれない |

## 結果

- 良くなること: 古い依存と脆弱性に、調べなくても気づく。固定した系列が知らないうちに動かない
- 受け入れる負担: 週に 2 本（npm と GitHub Actions）と、メジャーの数だけの PR が来る
- 守ること: 系列を固定する ADR を足したときは、`dependabot.yml` の無視にその依存を足す
