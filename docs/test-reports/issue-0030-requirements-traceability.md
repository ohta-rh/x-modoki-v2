---
type: TestReport
title: "試験レポート: 全部の要件が、通っているテストに結びついている"
description: "#30 で、全ての FR- と NFR- の要件と全ての URL を確かめるテストに結びつけた表と、それを CI で確かめる scripts/check-traceability.mjs を作り、足りなかったテストを足し、その途中で見つけたバグ 3 件（#62・#63・#64）を直した記録。"
tags: [test-report, requirements, traceability, testing]
status: stable
---

# 試験レポート: 全部の要件が、通っているテストに結びついている

## 対象

- issue: [#30](https://github.com/ohta-rh/x-modoki-v2/issues/30)
- commit: `dd829ba`・`cfe82c4`・`fd4ec65`（ブランチ `m1/local-app`、PR #40）
- CI: https://github.com/ohta-rh/x-modoki-v2/actions/runs/44393301313 （`47c073e`。3 つの commit を含む。緑）
- 日付: 2026-11-19

## 環境

- macOS 26.2、Node.js 26.12.0（`.nvmrc` は 24。CI の実行を本当の結果とする）、Docker Compose の PostgreSQL 18・Garage・`webkit`（ADR-0052）
- 動かし方: `pnpm verify`。画面は `pnpm build && pnpm start -p 3300`。文書は push したあと GitHub を Chrome で開いた

## 判定

合格 — 受け入れ条件 5 件のうち 5 件を満たした（受け入れ条件 1 は ADR-0053 の注記のとおり。#NN で確かめる 19 件の内訳は issue の本文の頭）。

## 受け入れ条件ごとの結果

| # | 条件 | 確かめ方 | 結果 | エビデンス |
|---|---|---|---|---|
| 1 | `traceability.md` に、全ての `FR-` と `NFR-` の ID について、満たす PBI と確かめるテストがある | `node scripts/check-traceability.mjs`（`pnpm docs:check` の中）、`check-traceability.test.mjs` | 合格。ID 144 件に 144 行。125 行がテスト、19 行が開いている PBI（#31・#32・#33・#34・#37）を名指し | 下の出力 |
| 2 | テストに ID があり、`grep` で ID からテストを引ける | 同じスクリプト（行が名指すファイルが ID を含むか）。`grep -rn "FR-POST-" src e2e` | 合格 | 同上 |
| 3 | 対応が無かった要件にテストが足されている | 差分。要件ごとに、今あるテストが条件の全部を確かめているかを突き合わせた（25 件）。足りないものにテストを足し、作りの側を壊して落ちるのを見た | 合格（下の TDD の記録） | 同上 |
| 4 | ルーティングの 1 節の全部の URL に Playwright のテストがある | 同じスクリプト（URL の行は `e2e/` のテストだけを認める） | 合格（22 の URL） | `traceability-*.jpg` |
| 5 | 登録 → プロフィールの編集 → 画像つきの投稿 → 別のユーザーがフォロー・返信・いいね → 通知、の通しの画面のテスト | `e2e/journey.spec.ts`（3 つのブラウザ） | 合格 | 下の出力 |

## 自動のテスト

`pnpm verify`（7 つの確認、`fd4ec65` の作業の木）:

```
docs check passed: 127 file(s)
traceability check passed
 Test Files  171 passed (171)
      Tests  875 passed (875)
Statements   : 100% ( 2507/2507 )
Branches     : 100% ( 1662/1662 )
Functions    : 100% ( 637/637 )
Lines        : 100% ( 2181/2181 )
  270 passed (1.7m)
VERIFY_RC=0
```

### TDD の記録

| # | 振る舞い | 先に書いたテスト | 赤（落ちた理由） | 緑にした実装 |
|---|---|---|---|---|
| 1 | テストの無い要件・無いファイル・無いテストの名前・ID を持たないテスト・e2e でない URL のテストを指摘する | `check-traceability.test.mjs` の 4 本 | `AssertionError: expected +0 to be 1`（4 本とも。スクリプトが何も見ていない） | `scripts/lib/check-traceability.mjs` |
| 2 | このリポジトリの全部の要件と URL が結びついている | `check-traceability.test.mjs` › このリポジトリでは、全部の要件と URL がテストに結びついている | `traceability check failed: …`（表が無い、のちに足りない行） | `docs/requirements/traceability.md` と、各テストの上の ID |
| 3 | あとの PBI は、要件の表に名指しされているときだけ受け持てる | 同 › あとの PBI が受け持つ要件は「#NN で確かめる」と書ける… | `expected { code: 1 … } to deeply equal { code: +0 … }` | `LATER` の読み取り |
| 4 | 品質の確認の設定（カバレッジ・CI の順・lint・Workers・3 つのブラウザ） | `quality-gates.test.ts` の 5 本。それぞれ設定を弱めた作りで流した | `expected { lines: 99 … }`、`not to match /^\s*continue-on-error:/m`、`'eslint . && …' to be 'eslint --max-warnings 0 . && …'`、`expected [] to include 'no-restricted-imports'`、`expected [ 'chromium', 'firefox' ] …` | 設定はもとのまま（テストで留めた） |
| 5 | `pnpm docs:check` が結びつきも確かめる | `quality-gates.test.ts` › ドキュメントの確認は、要件とテストの結びつきも確かめる | `Received: "node scripts/check-docs.mjs"` | `package.json` の `docs:check` |
| 6 | 通しの画面のテスト | `e2e/journey.spec.ts` | 文言を逆にして見た: `Expected substring: "…さんがあなたのポストを保存しました"` | 作りは変えない |
| 7 | 削除した投稿は、どちらのタブにも出ない（FR-TL-05） | `get-timeline.test.ts` › 削除した投稿は、フォロー中にもおすすめにも出ない | 絞り込みを外した作りで `expected [ '自分が消した', '消した', '残る' ] to deeply equal [ '残る' ]` | 作りは変えない |
| 8 | フォローしている人のリポストが「フォロー中」に出る（FR-CONV-06） | 同 › フォローしている人のリポストは… | リポストの行を外した作りで `expected [] to deeply equal [ [ '元の投稿', 'フォロー中の人' ] ]` | 作りは変えない |
| 9 | 通知は元の操作と同じトランザクション（FR-NOTIF-01） | `set-like.test.ts`・`set-follow.test.ts` › …コミットで失敗すると、通知も残らない | 通知を別の接続で書いた作りで `expected [ { recipientId: 'user-1x1', … } ] to deeply equal []` | コミットのときに失敗させる `failingAtCommit`（`test/db.ts`） |
| 10 | 自分の投稿の引用では通知ができない | `create-post.test.ts` › 自分の投稿を引用しても、通知はできない | 自分を除く絞り込みを外した作りで同じ形の失敗 | 作りは変えない |
| 11 | 6 種類の通知のアイコンと色（FR-NOTIF-03） | `notification-list.test.tsx` › %s の行は %s のアイコンを %s で出す | 2 つのアイコンを入れ替えた作りで `repost …` と `mention …` が落ちた | 作りは変えない |
| 12 | トーストは数秒で消える（FR-OPS-07） | `query-provider.test.tsx` › トーストは 4 秒のあいだ出ていて、6 秒たつと消える | 閉じない作りで `expected <h2 data-slot="toast-title" …> to be null` | 作りは変えない |
| 13 | 選んだアクセントの色が、投稿のボタンとリンクの色になる（FR-SHELL-07） | `keyboard-settings.spec.ts` › 選んだアクセントの色が… | `brand` を青に固定した作りで `Expected: "rgb(120, 86, 255)" / Received: "rgb(29, 155, 240)"` | 作りは変えない |
| 14 | 画像でないもの・5MB を超える GIF は拒まれる（FR-POST-06） | `media.spec.ts` › 画像を選ぶ欄は 4 つの形式だけを受け付け… | 上限を 10MB にした作りで `element(s) not found`（知らせが出ない） | 作りは変えない |
| 15 | 本番（https）では cookie に Secure（NFR-SEC-04） | `auth.test.ts` › NFR-SEC-04: 本番（https の URL）では… | `useSecureCookies: false` の作りで `expected 'better-auth.session_token=…' to match …Secure` | 作りは変えない |
| 16 | 主な画面は日本語（NFR-I18N-01） | `e2e/language.spec.ts` | `Received: "Notifications"` — 本物のバグ（#64 として直した） | #64 |
| 17 | `#3` は `#32` の要件を受け持てない（レビュー 1） | `check-traceability.test.mjs` に足した確かめ | `expected '' to match /NFR-PERF-01: #3 does not own it/` | 番号を数字の切れ目まで比べる |
| 18 | テストの名前は、テストの題としてだけ数える（レビュー 2） | `check-traceability.test.mjs` › テストの名前は、test・it・describe（each を含む）の題としてだけ数える | `expected '' to match /…has no test named "FR-POST-01 投稿できる"/` | `titled()` の正規表現 |

- 7〜15 は、すでに動いていた振る舞いのテスト。初めて流して通ったテストは信じないので、作りの側を一時的に壊して落ちるのを見てから、元に戻した（`git diff --stat` で戻ったことを確かめた）

## コードレビュー

- 判定: APPROVE（2 回目）　範囲: `dd829ba~1..cfe82c4`、のちの `fd4ec65`　レビューした sub agent: code-reviewer（opus）

| # | 重さ | 指摘 | 確かめた結果 | 対応 |
|---|---|---|---|---|
| 1 | major | `#NN で確かめる` が 19 行あり、issue の注記が許す 12 行を超える。7 行（NFR-A11Y-04・06、NFR-COMPAT-02、NFR-SEC-01・03・08、NFR-I18N-03）は、終わった PBI も受け持つので、ID のコメントの付いたテストを書くべき | 7 行は、開いている PBI も「満たす PBI」に入っていて、ADR-0053 の条件は満たす。要件の突き合わせで、どれも今のテストでは一部しか確かめていないことが分かっていた。一部だけのテストを書くと、残りが確かめられたように見える。注記の「12 件」は私が書いた古い数だった | 退けた（表は変えない）。issue の注記を 19 件とその理由に直した |
| 2 | minor | 受け持ちの比べ方が部分一致で、`#3` が `#32` の要件で通る | 再現した（`'#32'.includes('#3')` が true） | 直した（`cfe82c4`）。テスト: TDD の記録の 17 |
| 3 | minor（2 回目） | テストの名前を、ファイルの中のどこかの文字列として探す。`fill('通しの返信')` の引数でも通る | 再現した | 提案どおりに直した（`fd4ec65`）。テスト: TDD の記録の 18。今の表の行は全部、本物のテストの題を指していた |

## ブラウザでの確認

| URL | 幅 | テーマ | した操作 | 見えた結果 | 画面の写真 |
|---|---|---|---|---|---|
| GitHub の `docs/requirements/traceability.md` | 1280 / 768 / 375 | GitHub の既定 | push したあとに開いた | 表 4 つ（前置きの表を含む）、行 174、生の `\|` の行 0、ADR-0053 へのリンクが効く | `traceability-*.jpg` |
| アプリ | — | — | 足した画面のテスト（通し・言語・アクセント・画像の拒み・プロフィールのタブ・スクリプト無し）を 3 つのブラウザで流した | 通った | 上の出力 |

- コンソール: エラー 0、警告 0（画面のテストの中で）　通信: 失敗 0

![GitHub の表（1280px）](evidence/issue-0030-requirements-traceability/traceability-1280.jpg)
![GitHub の表（375px）](evidence/issue-0030-requirements-traceability/traceability-375.jpg)

## 見つけた問題

1. **#60**（サーバーの HTML に投稿が無い）: NFR-COMPAT-03 の画面のテストで見つけ、直した
2. **#61**（手元の macOS の WebKit だけが落ちる）: #60 の確かめの中で見つけ、直した（ADR-0052）
3. **#62**（API が知らない `f` と `tab` を受け流す）: NFR-SEC-02 の突き合わせで見つけ、直した
4. **#63**（動きを減らす設定がハートにしか効かない）: NFR-A11Y-07 の突き合わせで見つけ、直した
5. **#64**（トーストの置き場が英語の名前）: NFR-I18N-01 の画面のテストで見つけ、直した
6. **私の誤り:** 結びつきの表を初めに作ったとき、下書きで「一部だけ」だった要件を、今あるテストにそのまま結びつけた。スクリプトは通ったが、受け入れ条件 3 を満たしていなかった。25 件を sub agent に突き合わせてもらい、足りない分を足した
7. **私の誤り:** #61 の ADR を先にコミットするため、#30 の ADR を 0052 から 0053 へずらした。#61 のコメントに 0053 が残り、#61 のレビューで直した
