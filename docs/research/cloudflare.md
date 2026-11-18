---
type: Research
title: "Next.js 16.4 を Cloudflare Workers で動かす方法の調査"
description: "Next.js 16.4 を Cloudflare Workers で動かす手段（OpenNext と vinext）、対応している機能、Workers・Hyperdrive・Images の制限と料金を、2026-11-18 に公式の情報で調べた結果。"
tags: [cloudflare, deployment, nextjs, pricing]
status: stable
---

# Next.js 16.4 を Cloudflare Workers で動かす方法の調査

## 調査日: 2026-11-18

調べ方: Cloudflare と OpenNext の公式のページを読み、版は `npm view` で確認した。ページが述べていないことは「記載なし」と書く。

---

## 1. 動かす手段

| 手段 | 中身 | 版（npm） | Cloudflare の位置づけ |
|---|---|---|---|
| vinext | Next.js の API を Vite の上に作り直したもの。Next.js そのものではない | `vinext` 1.4.6 | 「新しい Next.js のアプリには、OpenNext ではなく vinext を勧める」。Wrangler の自動の設定は vinext を使う |
| OpenNext（`@opennextjs/cloudflare`） | Next.js のビルドの結果を Workers で動く形に変えるアダプター。動くのは Next.js そのもの | 1.20.17（2026-11-12 更新）。peer は `next >=15.5.29 <16 \|\| >=16.4.5`、`wrangler ^4.148.0` | 「既存の OpenNext のアプリを保つための案内。互換性が許せば vinext へ移る」 |

- `wrangler` の最新は 4.164.0
- vinext は、ビルドのときの静的なプリレンダーと、ビルドのときの画像の最適化に対応していないと報じられている（二次の情報）。Cloudflare 自身は、Next.js 16 の API の約 94% に対応していると述べている（二次の情報）

## 2. OpenNext が対応している機能

出典は OpenNext の公式のページ。Cloudflare のページと食い違う点は、新しいほう（OpenNext）を採った。

| 機能 | 状態 |
|---|---|
| Next.js の版 | 「Next.js 16 の全てのマイナーとパッチ、Next.js 15 の最新のマイナー」 |
| 実行環境 | Node.js の実行環境を使う（`nodejs_compat` が要る） |
| Server Actions | 対応 |
| `after()` | 対応 |
| ISR・`revalidateTag`・`revalidatePath` | 対応。キャッシュの置き場所の設定が要る（3 節） |
| `'use cache'`（composable caching） | 対応と書かれている |
| Cache Components という名前での記載 | 記載なし |
| Partial Prerendering | 対応と書かれている。ただし「キャッシュの割り込みは PPR では動かない」 |
| `proxy.ts`（Node Middleware） | **1.20.3 から実験的に対応**。Cloudflare のページには「まだ対応していない」とある（古い記述）。issue #1277「`proxy.js` に対応していない」は 2026-08-25 に完了として閉じられた |
| `middleware.ts` | 対応 |
| 画像の最適化（`next/image`） | Cloudflare Images を通して対応 |
| Turbopack でのビルド | 対応と書かれている |

## 3. キャッシュの置き場所

- 「このページは SSG・ISR・データのキャッシュだけの話。SSR のルートは、キャッシュの設定が無くても動く」
- インクリメンタルキャッシュ: R2（勧められている）、Workers KV（結果整合なので勧められていない）、静的なアセット（読むだけ。再検証はできない）
- 時間での再検証を使うなら、キュー（Durable Objects）が要る
- タグのキャッシュ: D1 か Durable Objects
- 最小の設定は、`ASSETS` のバインディングと `nodejs_compat` だけ

## 4. ローカルでの開発

- 「一番よい開発の流れは、Next.js の `next dev` を使うこと」
- `next.config.ts` で `initOpenNextCloudflareForDev()` を呼ぶと、`next dev` の中から `getCloudflareContext()` で Cloudflare の資源に届く
- `opennextjs-cloudflare build && opennextjs-cloudflare preview` で、ビルドしたものをローカルの Workers の実行環境で動かせる
- Durable Objects のバインディングは、ローカルの開発では動かない

## 5. Workers の制限と料金

出典は Cloudflare の制限と料金のページ（制限のページは 2026-11-13 更新）。

| 項目 | Free | Paid（月 $5） |
|---|---|---|
| リクエスト | 1 日 100,000 | 月 1,000 万を含む。超えた分は 100 万あたり $0.30 |
| 1 リクエストの CPU の時間 | **10 ミリ秒** | 既定 30 秒、最大 5 分。月 3,000 万ミリ秒を含む |
| メモリ | 128MB | 128MB |
| Worker の大きさ | 圧縮する前で 64MiB。「圧縮したあとの上限は無い」 | 同じ |
| 1 リクエストからの外へのリクエスト | 50 | 10,000 |
| Cron Triggers | アカウントに 5 | アカウントに 250 |

OpenNext のページには「圧縮したあとで Free 3MiB、Paid 10MiB」とあるが、Cloudflare の制限のページのほうが新しい。

## 6. Hyperdrive（PostgreSQL への接続）

- 「Hyperdrive は Workers の Free と Paid の両方に含まれる」。Free は 1 日 100,000 回の問い合わせまで、Paid は無制限
- ローカルの開発では、Wrangler の設定の `localConnectionString` か環境変数で、ローカルのデータベースを指す
- `pg`（node-postgres）は `nodejs_compat` で動く。案内は 8.16.3 より新しい版を使うよう書いている
- ローカルの Miniflare の中継は、パスワードに英数字しか使えないという報告がある（二次の情報）

## 7. Cloudflare Images（画像の変換）

- Free: 月に 5,000 種類の変換まで無料。R2 に置いた画像の変換に使える
- Paid: 最初の 5,000 種類を含み、その先は 1,000 種類あたり月 $0.50

## 8. 推奨・結論

- **Next.js そのものを動かすなら、手段は OpenNext だけ。** vinext は Cloudflare が勧めているが、Next.js の作り直しで、対応していない機能がある
- OpenNext は Next.js 16.4.6 に対応している（peer の範囲で確認）。`proxy.ts` は実験的な対応で、Cache Components という名前での対応は書かれていない
- Free の CPU 10 ミリ秒は、サーバーで描く Next.js のページには足りない見込み（推測。実際には測っていない）。Paid の月 $5 を見込む
- PostgreSQL は Cloudflare の外（Neon など）に置き、Hyperdrive でつなぐ。ローカルは Docker の PostgreSQL を `localConnectionString` で指す
- `sharp` のようなネイティブのモジュールは Workers で動かない。画像の変換は、Cloudflare Images を使うか、ブラウザで済ませる
- ローカルの開発は `next dev` のままでよい。Workers の実行環境での確認は `opennextjs-cloudflare preview` で行う

## 未検証事項

- OpenNext の上で Cache Components（`cacheComponents: true`）と `partialPrefetching` が動くか
- OpenNext の上で `proxy.ts` が実際に動くか（実験的な対応）
- Free の CPU 10 ミリ秒で、どのページが動き、どのページが止まるか
- Better Auth と Drizzle と `pg` を、Hyperdrive を通して Workers で動かしたときの振る舞い
- Hyperdrive の同時の接続の上限
- vinext が対応していない機能の正確な一覧（二次の情報だけ）

## 参考リンク

- [Cloudflare: Next.js（OpenNext）の案内](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- [OpenNext: Cloudflare](https://opennext.js.org/cloudflare)
- [OpenNext: Caching](https://opennext.js.org/cloudflare/caching)
- [OpenNext: Known issues](https://opennext.js.org/cloudflare/known-issues)
- [OpenNext: Develop and deploy](https://opennext.js.org/cloudflare/howtos/dev-deploy)
- [opennextjs-cloudflare issue #1277](https://github.com/opennextjs/opennextjs-cloudflare/issues/1277)
- [Cloudflare Workers: Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Workers: Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Hyperdrive: Pricing](https://developers.cloudflare.com/hyperdrive/platform/pricing/)
- [Cloudflare Hyperdrive: Local development](https://developers.cloudflare.com/hyperdrive/configuration/local-development)
- [Cloudflare Images: Pricing](https://developers.cloudflare.com/images/pricing/)
- [Cloudflare のブログ: vinext](https://blog.cloudflare.com/vinext)
- [InfoQ: Cloudflare vinext（experimental）](https://infoq.com/news/2026/03/cloudflare-vinext-experimental)
- npm registry（`npm view`、2026-11-18）: `@opennextjs/cloudflare`、`wrangler`、`vinext`、`@vitest/coverage-v8`
