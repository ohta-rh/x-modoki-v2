---
type: Research
title: "バックエンド技術選定（DB / ORM / 認証 / ストレージ / リアルタイム / ジョブ / デプロイ）"
description: "データベース・ORM・認証・画像の置き場所・リアルタイム・ジョブ・配備の候補を、2026-11-18 の時点の版と料金で比べた結果。"
tags: [database, auth, storage, deployment, pricing]
status: stable
---

# バックエンド技術選定（DB / ORM / 認証 / ストレージ / リアルタイム / ジョブ / デプロイ）

## 調査日: 2026-11-18

バージョンは `npm view`（npm registry、2026-11-18 取得）、価格・制限は各公式ページの WebFetch で確認。確認できなかった項目は「未検証」と明記した。

前提: Next.js 最新は `next@16.4.6`（latest）。`adapterPath`（Deployment Adapters API）は v16.2.0 で stable 化。

---

## 1. データベース

### 比較表

| 候補 | 無料枠 / 最低価格（USD） | ローカル docker との同一性 | 日本語検索 | コメント |
|---|---|---|---|---|
| **PostgreSQL（Neon）** | Free $0: 100 projects、各 1GB（アカウント合計 20GB）、100 CU-h/project、5 min で scale to zero（無効化不可）。Launch は従量 $0.106/CU-h + $0.35/GB-月（月額下限なし、例: 140 CU-h・1GB で約 $15） | 高い（標準 Postgres。docker の `postgres` イメージで同一） | `pg_trgm` あり。`pg_bigm` / `pgroonga` は拡張一覧に無い（サポートへ要望という扱い） | Vercel Marketplace 経由で導入可。Databricks 傘下 |
| **PostgreSQL（Supabase）** | Free $0: DB 500MB、2 active projects、**1 週間無活動で pause**。Pro $25/月〜（DB 8GB） | 高い（`supabase start` or 素の Postgres） | **PGroonga** を公式ドキュメントで提供。`pg_trgm` もあり。`pg_bigm` は未確認 | Auth / Storage / Realtime 同梱だが、今回は Next.js 内で完結させたいので DB のみ利用が妥当 |
| **Vercel Postgres** | **提供終了**。既存 DB は 2024-12 に Neon へ自動移行。新規は Marketplace の Neon 等 | - | - | `@vercel/postgres` は非推奨 |
| **Turso / libSQL** | Free $0: 5GB、500M rows read、10M rows written。Developer $4.99/月（9GB、25M writes） | 中（`sqld` / ローカル SQLite ファイルで近似） | FTS5 は使えるが日本語トークナイザは自前（trigram 等）。Postgres 拡張ほど手厚くない（詳細は未検証） | 書き込み量課金。ソーシャル（fan-out 書き込み）はクォータが読みづらい |
| **PlanetScale Postgres** | 最小 PS-5 $5/月（単一ノード）、HA で $15/月。**無料枠の記載なし** | 高い | 拡張可否は未検証 | PoC には割高感はないが無料ではない |
| **セルフホスト Postgres** | VPS に同居なら追加費用ほぼ 0（Fly Managed Postgres は最小 $38/月 + $0.28/GB） | 完全一致（同じイメージ） | **PGroonga / pg_bigm を自由に導入可（自前ビルドのイメージ）** | バックアップ運用は自己責任 |

### 日本語全文検索（Postgres）

| 方式 | 日本語 | 備考 |
|---|---|---|
| 組み込み FTS（`tsvector`） | 不可（空白区切り前提で日本語は分割されない。標準の日本語辞書なし） | ハッシュタグ検索（`#tag` の完全一致）だけなら B-tree で足りる |
| `pg_trgm` | 部分的（3-gram。2 文字以下の語に弱い。LIKE/ILIKE の高速化には使える） | Neon・Supabase ともに可 |
| `pg_bigm` | 良好（2-gram。LIKE 高速化。2 文字語に強い） | AWS RDS は対応。Neon の拡張一覧には無い。Supabase は未確認 |
| **PGroonga** | 最良（形態素 / TokenMecab 等。PGroonga 側の公式ベンチで pg_bigm より 24〜43 倍高速） | Supabase は公式提供。Neon 不可（一覧に無い）。セルフホストなら Groonga 入りイメージを使う |

### 結論（項目 1）

- 本番とローカルで差が出ないのは **PostgreSQL**。ローカルは docker compose の `postgres`、本番は Neon（Vercel 構成）またはセルフホスト。
- 日本語検索を最初から重視するなら、(a) セルフホスト + PGroonga（または pg_bigm）、(b) Supabase（PGroonga 提供）が確実。Neon 無料枠で行く場合は `pg_trgm` で始め、精度不足なら外部検索（Meilisearch 等、未調査）を検討。
- SQLite/Turso は読み取り中心なら魅力的だが、タイムライン fan-out の書き込み量課金と日本語 FTS の弱さからソーシャル用途では第二候補。

---

## 2. ORM / クエリ層

### バージョン（npm 確認）

| パッケージ | latest | 備考 |
|---|---|---|
| `drizzle-orm` | **0.45.4**（stable） | `1.0.0-beta.22` と `1.0.0-rc.5`（`rc` タグ）が存在。**1.0 は未 GA**（2026-11-18 時点で `latest` は 0.45.4）。rc.5 でも RQB の絞り込み・エラー周りで破壊的変更があったとの二次情報あり |
| `drizzle-kit` | 0.31.11 | 1.0 系は beta/rc |
| `prisma`（CLI） | `latest` タグ = **8.0.0-rc.34**（RC） | `prev` = 7.10.1 |
| `@prisma/client` | **7.10.1**（latest） | 7.0（2025-11-19）で Rust-free クライアントが既定化。8 は RC（Prisma 公式ブログは 8 を告知しているが npm 上は RC タグ） |
| `kysely` | 0.29.9 | 1.0 未到達 |

### 比較表

| 観点 | Drizzle | Prisma 7 | Kysely |
|---|---|---|---|
| 型安全 | スキーマ = TS。クエリ結果型は推論 | 生成クライアント（`prisma-client` ジェネレータ、Rust エンジン無し） | クエリビルダ。スキーマ型は別途用意（kysely-codegen 等） |
| リレーション取得 | RQB（`db.query.x.findMany({ with })`）＋ SQL ライクな select/join | `include` / `select` が最も直感的 | JOIN を手書き（JSON 集約ヘルパあり） |
| マイグレーション | `drizzle-kit generate/migrate/push`（SQL ファイル生成） | `prisma migrate`（成熟） | 同梱のマイグレータ（簡素） |
| Serverless/Edge ドライバ | `neon-http`、`libsql`、`postgres-js`、`node-postgres` など広い | driver adapters（pg / neon / libsql 等） | dialect 差し替え |
| カーソルページング | 手書き `where(lt(id, cursor))` + `orderBy` + `limit`。複合キー（`(created_at, id)`）の row-value 比較は `sql` で書く | 組み込み `cursor` / `skip` / `take`（単一キー向き） | `where` + `orderBy` を素直に書ける |
| 生 SQL 逃げ道 | `sql` テンプレートが強力（タイムライン複雑クエリ向き） | `$queryRaw`（型は手動） | ほぼ SQL |
| バンドル / コールドスタート | 軽量 | 7 で大幅改善（ベンダー主張: バンドル 90% 減。未検証） | 軽量 |
| 成熟度リスク | 1.0 待ち（0.x で破壊的変更が起こり得る） | 7 → 8 移行期 | 安定だが 1.0 未満 |

### 推奨

**Drizzle ORM 0.45.x + drizzle-kit 0.31.x を pin**（1.0 の GA 後に移行）。理由: タイムライン・通知・検索（`pg_trgm` / PGroonga の演算子）で SQL を直接書く場面が多く、`sql` テンプレートの自由度が高い。Zod 連携は 1.0 系で `drizzle-orm/zod` に統合（0.x は `drizzle-zod`）。次点は Prisma 7.10.1（宣言的スキーマと移行の成熟度を取る場合）。`1.0.0-rc` を使うかは、RQB の破壊的変更を許容できるかで判断（PoC なら可、ただし pin 必須）。

---

## 3. 認証

### 状況

- **Auth.js（NextAuth）は 2025-09-22 に Better Auth チームの管理下へ移管**。既存利用者はセキュリティ修正・緊急対応のみ継続、**新規プロジェクトには Better Auth を強く推奨**と公式告知（Better Auth ブログ）。npm では `next-auth` の `latest` は 4.24.15、v5 は `beta`（5.0.0-beta.32、最終更新 2026-07-20）のまま **GA せず**。
- **Lucia は非推奨**（npm `deprecated`、公式は「ライブラリではなく学習教材」へ移行。`lucia@3.2.2` が最終）。
- Vercel による Better Auth 買収の記述が二次情報にあるが、**未検証**（一次情報なし）。

### 比較表

| 候補 | 最新 | DB セッション / JWT | ID+PW | OAuth | Passkey | 料金 | 評価 |
|---|---|---|---|---|---|---|---|
| **Better Auth** | `better-auth@1.7.25`（beta 1.8.0-beta.10）。passkey は `@better-auth/passkey@1.7.25` | DB セッション（既定）+ cookie キャッシュ。Auth.js 的な DB 無しステートレス運用は未対応（ロードマップ） | 標準対応 | Google / GitHub 等多数 | プラグイン | 無料（OSS） | **推奨**。Drizzle アダプタあり、Next.js 向け `toNextJsHandler` あり（詳細な 16.4 互換検証は未実施） |
| Auth.js v5 | beta.32（GA せず） | JWT / DB 両対応 | Credentials は JWT 前提で制約あり | 多数 | あり（実験的） | 無料 | 新規採用は非推奨（保守モード） |
| Clerk | `@clerk/nextjs@7.10.2` | ホスト型 | あり | あり | あり | Hobby 無料（50,000 MRU/app）、Pro $25/月（年払い $20） | 最速だが外部依存・データ主権・ローカル完結性に難。「docker compose だけで動く」要件に合わない |
| Lucia | 3.2.2（deprecated） | - | - | - | - | - | 使用不可 |
| 自前実装 | - | - | - | - | - | 無料 | 学習目的以外は非推奨（パスワードハッシュ・レート制限・メール検証を全部自前） |

### 結論（項目 3）

**Better Auth 1.7.x + Drizzle アダプタ、DB セッション**。ユーザー名+パスワード（`username` プラグイン）、メール検証、Google/GitHub OAuth、passkey を同一ライブラリで賄える。ローカルは docker の Postgres のみで完結。次点は Clerk（認証実装を丸ごと外注したい場合）。

---

## 4. メディアストレージ（画像アップロード）

### 比較表

| 候補 | 料金（USD） | 備考 |
|---|---|---|
| **Cloudflare R2** | 無料枠: 10GB-月 / Class A 1M / Class B 10M。超過: $0.015/GB-月、Class A $4.50/M、Class B $0.36/M。**egress 無料** | S3 互換 → presigned URL 直接アップロード可。Vercel 外でも使える |
| Vercel Blob | Hobby 無料: 1GB、読取 10K、書込 2K、転送 10GB。Pro: $0.023/GB 〜、書込 $4.50/M | Hobby の 1GB は画像 4 枚/投稿だとすぐ枯渇。クライアント直接アップロード対応 |
| AWS S3 | 従量（今回は未取得） | egress 課金がある。未検証 |
| UploadThing | Free 2GB（全アプリ共有）、$10/月で 100GB、Usage Based $25/月〜。`uploadthing@7.7.4`（最終公開 2025-08） | 手軽だが更新が止まり気味（npm 上の最終更新 2025-08-17） |

### ローカル開発エミュレーション

- **MinIO Community Edition は事実上終了**: 2025-12 に maintenance mode、2026 初頭に GitHub リポジトリが read-only アーカイブ（日付は二次情報で 2026-04-25 とするものがあるが、MinIO の公式声明は未確認）。管理 UI は 2025-05 に CE から削除、公式バイナリ / コンテナイメージは CE では非配布。**新規採用しない**。
- 代替（二次情報ベース、いずれも未検証）: **Garage**、**SeaweedFS**（1.0.0-rc.6）、**RustFS**、**S3Proxy**。docker compose の dev 専用なら Garage か SeaweedFS が現実的。もしくはローカルでも R2 の dev バケットを使う（無料枠内）。
- 抽象化: アップロード層を `S3Client`（AWS SDK v3）で書き、`endpoint` と `forcePathStyle` を env で切り替えるだけにすれば、実装差し替えが容易。

### presigned 直接アップロードのパターン

1. Server Action / Route Handler が認証・枚数（4 枚）・MIME・サイズを検証し、`PutObject` 用 presigned URL を発行（有効期限 60 秒程度、`Content-Length` 範囲を署名に含める）。
2. ブラウザが R2/S3 へ直接 PUT（Vercel 関数の 4.5MB 級ボディ上限を回避。上限値は今回未確認）。
3. 完了後に Server Action で DB に `media` 行を登録（キー、幅・高さ、MIME）。孤児オブジェクトは Cron で掃除。

### `next/image` のコスト

- **Vercel 上**: Hobby は変換 5K/月・キャッシュ読取 300K/月・キャッシュ書込 100K/月まで無料。Pro は変換 $0.05/1K、読取 $0.40/M、書込 $4/M。画像が多い SNS は変換数が増えやすい。
- **セルフホスト**: `next start` で追加設定なしに最適化が動く（glibc Linux では sharp のメモリアロケータ設定が推奨、公式ドキュメント）。CPU/メモリを消費するため、小さい VPS では `images.unoptimized` + アップロード時にリサイズ（sharp で複数サイズ生成）の方が安定。R2 + カスタム `loader` や Cloudflare Images も選択肢。
- 推奨: アップロード時にサーバー側（または Cron / `after()`）で WebP へ縮小して保存し、表示は `unoptimized` か軽量 loader。

### 結論（項目 4）

**Cloudflare R2 + presigned URL 直接アップロード（AWS SDK v3）**。ローカルは Garage（or SeaweedFS）を docker compose に追加し、`S3_ENDPOINT` で切り替え。MinIO は避ける。

---

## 5. リアルタイム（新着バッジ・通知・将来の DM）

### Vercel 上の実現性

- Function の最大実行時間（Fluid compute 有効時）: **Hobby 300s（上限も 300s）**、Pro 既定 300s・最大 800s、ベータで 1800s（Vercel docs, 2026-08-24 更新）。SSE は可能だが接続が最大 5 分で切れるので再接続前提。長時間接続は Active CPU は課金停止（I/O 待ち）でも、Provisioned Memory は課金対象。
- Vercel Functions の **WebSocket はパブリックベータ（全プラン）**（Vercel KB の記載。接続の固定化など制約あり、詳細未検証）。PoC の基盤としては非推奨。

### 比較表

| 方式 | Vercel serverless | 常駐 Node（VPS / Fly 等） | コスト | PoC 適性 |
|---|---|---|---|---|
| **ポーリング**（`fetch` 30〜60 秒間隔。タブ可視時のみ） | 可 | 可 | 呼び出し数のみ。Hobby の 1M invocations で十分（要試算） | **高**: 新着インジケータ・通知バッジに最適 |
| SSE（Route Handler） | 可（5 分で切断、再接続） | 可（長時間接続も OK、nginx は buffering off 必須） | 接続数に比例した関数時間 | 中: 常駐環境なら高 |
| WebSocket 自前 | 非推奨 | 可（`ws` を custom server で） | - | DM フェーズで検討 |
| Postgres LISTEN/NOTIFY | Serverless では接続維持が難しい | 可（専用接続 1 本から SSE へ配信） | 無料 | 常駐環境で SSE と組み合わせると良い。Neon の pooled 接続（PgBouncer）では LISTEN が使えない点に注意 |
| Pusher Channels | 可 | 可 | Sandbox 無料: 100 同時接続、200K メッセージ/日。Startup $49/月 | 外部 SaaS。DM 開始時の候補 |
| Ably | 可 | 可 | Free: 500 MAU 相当。Pro $29/月〜（1K MAU、年払い） | 同上 |
| Supabase Realtime | 可 | 可 | Free: 同時 200 接続、200 万メッセージ/月。Pro 500 接続・500 万メッセージ | Supabase DB 採用時のみ自然 |
| PartyKit / Cloudflare | 可 | - | 未取得 | 未検証 |

### 結論（項目 5）

PoC は **ポーリング（SWR / TanStack Query の `refetchInterval`、タブ非表示時は停止）** で「新着あり」インジケータと通知バッジを実装。DM 着手時に、常駐 Node 構成なら **SSE + Postgres LISTEN/NOTIFY**、Vercel 構成なら Pusher / Ably の free tier を採用。

---

## 6. バックグラウンド処理（fan-out・通知生成・カウンタ）

### 比較表

| 候補 | 内容 | 料金（USD） | 適性 |
|---|---|---|---|
| **Next.js `after()`** | レスポンス送信後に実行。セルフホスト（`next start`）で完全対応、SIGTERM で pending callback 完了を待つ。Vercel では `waitUntil` 相当 | 無料 | 小さい後処理（通知行 INSERT、カウンタ更新）に最適。失敗時の再試行は無い |
| Vercel Cron | Hobby は **1 日 1 回・時間精度 ±59 分**まで。Pro は毎分 | Hobby 無料 | 掃除用途のみ |
| Vercel Queues / Workflows | Queues は初回 100 万オペレーション込み（料金表は読み取り不完全、**未検証**）。Hobby に Workflow 50K events/月 | 従量 | 再試行付きジョブが欲しい場合 |
| Inngest（`inngest@4.26.2`） | イベント駆動、ステップ関数 | Free: 5 万 executions/月、同時 5 ステップ。Pro $99/月 | Vercel 構成で再試行が必要なら有力 |
| Trigger.dev（`@trigger.dev/sdk@4.8.5`） | 長時間タスク | Free: $5 クレジット、同時 20。Hobby $10/月 | 動画変換等の重い処理向き。本件には過剰 |
| pg-boss（`12.38.2`）/ graphile-worker（`0.18.0`） | Postgres をキューに利用。常駐ワーカー要 | 無料 | **常駐 Node 構成**で追加インフラ不要 |

### フォロー関係と fan-out

- フォロワー数が数十〜数千のスケールでは **fan-out on read**（フォロー先の投稿を `JOIN` + `(created_at, id)` カーソルで取得）が最も単純で正しい。書き込み時 fan-out は不要。
- カウンタ（いいね数・リポスト数）は `posts` の非正規化カラムを **同一トランザクション内**で更新（`UPDATE ... SET like_count = like_count + 1`）するか、毎回 `COUNT` で集計（この規模なら許容）。ジョブ不要。
- 通知行の生成は `after()` で十分。厳密な「少なくとも 1 回」が必要なら **トランザクショナル Outbox**（通知行も同一トランザクションで INSERT）にすれば `after()` 失敗でも欠落しない。
- 推奨ジョブ: 孤児メディア掃除・推薦フィード再計算などは Cron（Vercel Cron の 1 日 1 回 or 常駐構成の pg-boss）。

### 結論（項目 6）

**`after()` + 同一トランザクション内の Outbox 方式**で開始。定期処理は Cron、再試行が要るなら Vercel 構成は Inngest free、常駐構成は pg-boss を後付け。

---

## 7. バリデーション・環境変数・レート制限

### 比較表

| 項目 | 候補 | 最新 | 備考 |
|---|---|---|---|
| スキーマ検証 | **Zod** | `zod@4.6.7` | 4 系が `latest`（メジャー 4）。Server Action / Route Handler の入力検証に広く使われ、Drizzle / Better Auth とのエコシステムが厚い |
| 〃 | Valibot | `valibot@1.5.0` | バンドル最小。クライアントのフォーム検証でサイズを重視する場合 |
| 〃 | ArkType | `arktype@2.2.9` | 高速・TS 構文。エコシステムは小さい |
| 環境変数 | **t3-env** | `@t3-oss/env-nextjs@0.13.11`（最終更新 2026-03-22） | Zod/Valibot/ArkType の Standard Schema 対応。1.0 未満だが安定。代替: 自前で `z.object(...).parse(process.env)` |
| レート制限 | Upstash Ratelimit | `@upstash/ratelimit@2.2.1` | Upstash Redis Free: 50 万コマンド/月・250MB。従量 $0.20/10 万コマンド。Vercel 構成向き |
| 〃 | **DB 内（Postgres）** | - | `rate_limits(key, window_start, count)` を UPSERT。この規模で十分、追加サービス不要、ローカル完結。Better Auth は組み込みレート制限（DB / メモリ）も持つ |

### 結論（項目 7）

**Zod 4.6.x + t3-env**、レート制限は **Postgres 内（`INSERT ... ON CONFLICT DO UPDATE`）**。Vercel の複数インスタンスでメモリ式が効かない問題を、DB 方式なら回避できる。トラフィックが増えたら Upstash に移行。

---

## 8. デプロイ

### 8.1 Vercel

| 項目 | Hobby | Pro |
|---|---|---|
| 料金 | $0 | $20/月（利用クレジット $20 込み）、開発者席 $20/人/月 |
| 関数最大実行時間（Fluid） | 300s | 既定 300s、最大 800s（ベータ 1800s） |
| Fast Data Transfer | 100GB | 1TB |
| Active CPU / Memory | 4h / 360 GB-h | 従量（$0.128/h、$0.0106/GB-h） |
| Image Optimization | 変換 5K・読取 300K・書込 100K/月 | $0.05/1K 変換 等 |
| Cron | 1 日 1 回 | 毎分 |
| **利用条件** | **利用規約 Section 4: 「personal or non-commercial use」のみ** | 商用可 |

- **Hobby の可否**: 趣味・非営利の PoC なら Hobby 可。広告・課金・事業目的が出た時点で規約上 Pro が必要（超過分は購入不可＝停止）。
- Vercel Postgres は終了。DB は Marketplace の Neon / Supabase / Prisma Postgres 等を利用。

### 8.2 セルフホスト（`output: 'standalone'` + Docker）

公式 self-hosting ガイドに基づく特別対応が必要な点:

| 機能 | 単一インスタンス | 複数インスタンス / 再デプロイ |
|---|---|---|
| ISR / data cache | ローカルディスクで自動動作 | `cacheHandler` / `cacheHandlers`（Redis か S3）が必須。`revalidateTag` のインスタンス間同期（`refreshTags()`）も必要 |
| 画像最適化 | `next start` でゼロ設定。sharp のメモリ設定推奨 | 同左（キャッシュは各インスタンス） |
| ストリーミング | nginx 等は `X-Accel-Buffering: no` で buffering 無効化 | LB も chunked / HTTP/2 対応が必要 |
| Server Actions | - | **`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` を全インスタンス共通化**しないと "Failed to find Server Action" |
| バージョンスキュー | - | `deploymentId` を設定 |
| `after()` | `next start` で完全サポート。SIGTERM で pending 完了を待機（10〜30 秒の drain 推奨） | 同左 |
| リバースプロキシ | 推奨（Caddy / nginx）。ペイロード上限・低速接続対策 | 同左 |

→ **1 インスタンス運用ならほぼ追加設定不要**。PoC はこの形が最も簡単。

### 8.3 Cloudflare

- OpenNext Cloudflare アダプタ `@opennextjs/cloudflare@1.20.17`（2026-11-12 更新）。Next.js 16 の全マイナー + 15 の最新マイナーをサポート。Node Middleware（`proxy.ts`）は 1.20.3 から実験的。Worker サイズ上限は Free 3MiB / Paid 10MiB（圧縮後）。ORM・認証・sharp 等で上限に当たりやすい。
- Deployment Adapters API は v16.2.0 で stable（`adapterPath`）。Next.js 公式のリファレンス実装は `nextjs/adapter-vercel`。Cloudflare 向け公式アダプタの有無は **未検証**。
- 本構成では Cloudflare は R2（ストレージ）のみ利用が無難。Workers 実行は追加の制約が多く、PoC の速度優先に合わない。

### 8.4 月額コスト試算（PoC、USD、為替 €1 ≈ $1.1 と仮定、一部は推定）

| 構成 | 内訳 | 月額 | 備考 |
|---|---|---|---|
| **A. Vercel Hobby + Neon Free + R2** | Vercel $0、Neon Free $0、R2 無料枠（10GB）$0 | **$0** | 非商用限定。Neon は無活動 5 分で scale to zero（初回アクセス遅延）。Hobby の Cron は 1 日 1 回 |
| A'. Vercel Pro + Neon Launch + R2 | Vercel $20、Neon 約 $0〜15（140 CU-h・1GB で $15 の公式例）、R2 $0〜1 | **約 $20〜36** | 商用可。画像最適化・転送は Pro クレジット内に収まる想定（未試算） |
| **B. 小型 VPS + Docker Compose** | Hetzner Regular Performance €5.49（約 $6、スペックはページ未記載のため未検証）、Postgres + アプリ + Garage を同居、R2 併用なら $0 | **約 $6〜7** | `after()`・pg-boss・SSE・LISTEN/NOTIFY が全部使える。バックアップ（`pg_dump` を R2 へ）は自前 |
| **C. Fly.io + 自前 Postgres（Fly Machine）** | shared-cpu-1x 1GB $6.70 ×2（アプリ + Postgres）+ ボリューム 3GB $0.45 | **約 $14** | Fly Managed Postgres を使うと最小 $38/月 + $0.28/GB（アプリ込みで約 $45） |
| C'. Railway Hobby | $5/月（$5 クレジット込み）+ 超過分: vCPU 約 $20/月、RAM 約 $10/GB/月、ボリューム約 $0.15/GB/月 | **約 $10〜20**（推定） | 2026-10-21 のセキュリティインシデントが Prisma ブログで言及（資格情報ローテーション推奨）。詳細は未確認 |

---

## N. 推奨・結論

| コンポーネント | 選択 | バージョン（2026-11-18 確認） | 理由 | 次点 |
|---|---|---|---|---|
| フレームワーク | Next.js（App Router） | 16.4.6 | 要件どおり | - |
| DB | PostgreSQL（ローカル docker / 本番 Neon or セルフホスト） | PG 17/18（拡張対応は各社確認） | ローカルと本番が同一。日本語検索の拡張を選べる | Supabase（PGroonga 提供）、Turso |
| 日本語検索 | `pg_trgm` で開始 → セルフホスト時 PGroonga / pg_bigm | - | 組み込み FTS は日本語不可。Neon は pg_trgm のみ | PGroonga（Supabase / セルフホスト） |
| ORM | Drizzle ORM + drizzle-kit | 0.45.4 / 0.31.11（1.0 は rc.5、未 GA） | SQL に近く、検索・タイムラインの生 SQL と相性が良い | Prisma 7.10.1（8 は RC） |
| 認証 | Better Auth（DB セッション、Drizzle アダプタ、username / email / OAuth / passkey） | 1.7.25 | Auth.js 後継として公式推奨。ローカル完結 | Clerk（7.10.2、外部依存） |
| ストレージ | Cloudflare R2 + presigned 直接アップロード（AWS SDK v3） | - | egress 無料、10GB 無料枠 | Vercel Blob（Hobby 1GB） |
| ローカル S3 | Garage（or SeaweedFS） | 未確認 | MinIO CE は終了 | R2 の dev バケット |
| 画像配信 | アップロード時に縮小 + `unoptimized`（または軽量 loader） | - | Vercel の変換課金・自前の CPU 負荷を回避 | `next/image` 既定 |
| リアルタイム | ポーリング（可視時のみ）→ DM 時に SSE + LISTEN/NOTIFY（常駐）or Pusher/Ably（Vercel） | - | PoC は最小実装で十分 | Supabase Realtime |
| ジョブ | `after()` + 同一トランザクション Outbox、定期処理は Cron | - | 追加インフラ不要で正しさを確保 | Inngest 4.26.2（Vercel 構成）、pg-boss 12.38.2（常駐構成） |
| 検証 | Zod | 4.6.7 | エコシステム最大 | Valibot 1.5.0 |
| 環境変数 | t3-env | 0.13.11 | 型安全な env | 自前 Zod パース |
| レート制限 | Postgres 内 UPSERT | - | 追加サービス不要 | Upstash Ratelimit 2.2.1 |
| デプロイ | **B: 単一 VPS + Docker Compose（standalone）**。非商用に限り A（Vercel Hobby + Neon Free + R2）も可 | - | 常駐 Node で SSE・pg-boss・PGroonga を制約なく使え、最安 | Vercel Pro、Fly.io |

推奨の一貫した構成案: **VPS 1 台（Caddy → Next.js standalone、Postgres、Garage or R2）**。ローカル docker compose と本番が同一構成になり、運用負荷は `pg_dump` バックアップのみ。「運用ゼロで試す」だけなら構成 A。

---

## コスト見積もり（PoC 月額, USD）

| 構成 | 月額 | 根拠ページ |
|---|---|---|
| A. Vercel Hobby + Neon Free + R2 | $0 | [Vercel Pricing](https://vercel.com/pricing) / [Neon Pricing](https://neon.com/pricing) / [R2 Pricing](https://developers.cloudflare.com/r2/pricing/) |
| A'. Vercel Pro + Neon Launch + R2 | 約 $20〜36 | 同上 |
| B. Hetzner VPS + Docker Compose（Postgres 同居、R2 無料枠 or Garage） | 約 $6〜7（€5.49） | [Hetzner Cloud](https://www.hetzner.com/cloud/) |
| C. Fly.io（アプリ + 自前 Postgres Machine） | 約 $14 | [Fly.io Pricing](https://docs.fly.io/about/pricing) |
| C-managed. Fly.io + Managed Postgres | 約 $45 | 同上 |
| C'. Railway Hobby | 約 $10〜20（推定） | [Railway Pricing](https://railway.com/pricing) |

---

## 未検証事項

- Drizzle 1.0 の GA 時期（`latest` は 0.45.4、`rc` は 1.0.0-rc.5。rc.5 の破壊的変更内容は二次情報のみ）。
- Prisma 8 の GA 状況（npm の `prisma` は `latest` が 8.0.0-rc.34、`@prisma/client` は 7.10.1。公式ブログは 8 を告知）。Prisma 7 の性能数値（バンドル 90% 減、3 倍高速）はベンダー主張。
- Better Auth と Next.js 16.4.x の互換性（実機検証なし）。Vercel による Better Auth 買収は二次情報のみ。
- Supabase での `pg_bigm` 提供有無。Neon での pg_bigm / PGroonga 追加可否はサポート確認が必要。Turso（libSQL）の日本語 FTS の実力。
- MinIO CE の公式アーカイブ日。Garage / SeaweedFS / RustFS のバージョンと Docker 運用実績。AWS S3 の現行価格。
- Vercel Queues の価格詳細と Hobby 制限、Vercel Functions WebSocket（ベータ）の制約、PartyKit / Cloudflare の価格。
- Cloudflare 向け Next.js Deployment Adapter（公式）の有無。OpenNext での PoC 構成の実動確認。
- Hetzner の具体スペック（ページに記載なし）、Railway の実使用量見積もり（推定値）、Railway のセキュリティインシデント詳細。
- Vercel 構成での関数呼び出し数（ポーリング含む）の実試算。

---

## 参考リンク

- [Auth.js is now part of Better Auth（Better Auth ブログ、2025-09-22）](https://better-auth.com/blog/authjs-joins-better-auth)
- [Auth.js is now part of Better Auth #13252（GitHub Discussion）](https://github.com/nextauthjs/next-auth/discussions/13252)
- [Neon Pricing](https://neon.com/pricing)
- [Neon: Postgres extensions 一覧](https://neon.com/docs/extensions/pg-extensions)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase: PGroonga](https://supabase.com/docs/guides/database/extensions/pgroonga)
- [PGroonga versus pg_bigm](https://pgroonga.github.io/reference/pgroonga-versus-pg-bigm.html)
- [Turso Pricing](https://turso.tech/pricing)
- [PlanetScale Pricing](https://planetscale.com/pricing)
- [Vercel Pricing](https://vercel.com/pricing)
- [Vercel: Function duration](https://vercel.com/docs/functions/configuring-functions/duration)
- [Vercel: Hobby plan](https://vercel.com/docs/plans/hobby)
- [Vercel: Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- [Vercel Legal Terms（Hobby: personal or non-commercial）](https://vercel.com/legal/terms)
- [Vercel Postgres transition（Neon）](https://neon.tech/docs/guides/vercel-postgres-transition-guide)
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [MinIO CE retired（解説記事）](https://glukhov.org/data-infrastructure/object-storage/minio-dead/)
- [MinIO archived: self-hosted S3 alternatives（解説記事）](https://pinggy.io/blog/minio_archived_self_hosted_s3_alternatives/)
- [UploadThing Pricing](https://uploadthing.com/pricing)
- [Clerk Pricing](https://clerk.com/pricing)
- [Next.js: Self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting)
- [Next.js: adapterPath](https://nextjs.org/docs/app/api-reference/config/next-config-js/adapterPath)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
- [Drizzle ORM: Latest releases](https://orm.drizzle.team/docs/latest-releases)
- [Drizzle v0 → v1 changes](https://orm.drizzle.team/docs/v0-v1-changes)
- [Announcing Prisma 7](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0)
- [Prisma Blog](https://www.prisma.io/blog)
- [Pusher Channels Pricing](https://pusher.com/channels/pricing/)
- [Ably Pricing](https://ably.com/pricing)
- [Upstash Redis Pricing](https://upstash.com/pricing/redis)
- [Inngest Pricing](https://www.inngest.com/pricing)
- [Trigger.dev Pricing](https://trigger.dev/pricing)
- [Railway Pricing](https://railway.com/pricing)
- [Fly.io Pricing](https://docs.fly.io/about/pricing)
- [Hetzner Cloud](https://www.hetzner.com/cloud/)
- npm registry（`npm view <pkg> version / dist-tags`、2026-11-18 取得）: next, drizzle-orm, drizzle-kit, prisma, @prisma/client, kysely, better-auth, next-auth, @auth/core, lucia, @clerk/nextjs, zod, valibot, arktype, @t3-oss/env-nextjs, @upstash/ratelimit, inngest, @trigger.dev/sdk, pg-boss, graphile-worker, @opennextjs/cloudflare, @vercel/blob, uploadthing
