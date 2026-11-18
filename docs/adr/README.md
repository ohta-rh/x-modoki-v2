---
type: Reference
title: "Architecture Decision Records"
description: "ADR の一覧とステータス。"
tags: [documentation]
status: stable
---

# Architecture Decision Records

アーキテクチャ・技術選定・横断ルールの決定を記録する。書き方は [ADR-0001](0001-record-architecture-decisions.md)、形式は [template.md](template.md)、各ファイルの先頭の frontmatter は [ADR-0002](0002-docs-as-okf-bundle.md)。

| ADR | タイトル | ステータス | 決定者 |
|---|---|---|---|
| [0001](0001-record-architecture-decisions.md) | アーキテクチャ上の決定を ADR として記録する | 採用 | ユーザー |
| [0002](0002-docs-as-okf-bundle.md) | `docs/` を Open Knowledge Format（OKF）v0.2 のバンドルとして管理する | 採用 | ユーザー／エージェント |
| [0003](0003-pbi-epic-issues-with-root-cause.md) | 作業は PBI 型の EPIC と子 issue で計画し、起票の前に根本原因を特定する | 採用 | ユーザー |
| [0004](0004-nextjs-16-all-in-one-app.md) | Next.js 16.4 の App Router で、UI とサーバーの処理を 1 つのアプリにまとめる | 採用 | ユーザー／エージェント |
| [0005](0005-toolchain-node24-pnpm-ts6-eslint.md) | 開発の道具は Node.js 24・pnpm 12・TypeScript 6.0・ESLint 10 とし、TypeScript 7 は見送る | 採用 | エージェント |
| [0006](0006-postgresql-drizzle.md) | データは PostgreSQL に置き、Drizzle ORM 0.45 系で読み書きする | 採用（接続の持ち方を ADR-0017 で置き換え） | エージェント |
| [0007](0007-better-auth-db-sessions.md) | 認証は Better Auth を使い、セッションはデータベースに持つ | 採用 | エージェント |
| [0008](0008-s3-compatible-media-storage.md) | 画像は S3 互換のストレージに、署名つき URL でブラウザから直接送る | 採用（サーバーでの画像の変換を ADR-0018 で置き換え） | エージェント |
| [0009](0009-mimic-x-ui-with-own-brand.md) | UI と操作は X の Web 版に合わせ、名前・ロゴ・アイコン・フォント・データは自前のものにする | 採用 | ユーザー／エージェント |
| [0010](0010-dal-server-actions-route-handlers.md) | 読み書きはデータアクセス層に集め、変更は Server Action、続きの読み込みは Route Handler で行う | 採用（ファイルの置き場所を ADR-0022 で置き換え） | エージェント |
| [0011](0011-polling-and-after-no-queue.md) | 新着と未読は定期的な確認で知らせ、あとの処理は同じトランザクションと `after()` で行い、キューを持たない | 採用（定期的な処理の呼び方を ADR-0017 で置き換え） | エージェント |
| [0012](0012-single-container-docker-compose.md) | `output: 'standalone'` のコンテナ 1 つで動かし、ローカルも本番も Docker Compose で同じ構成にする | 置き換え: ADR-0017 | エージェント |
| [0013](0013-vitest-playwright-testing.md) | 単体のテストは Vitest、画面を通したテストは Playwright で行い、データアクセス層は本物の PostgreSQL で試す | 採用 | エージェント |
| [0014](0014-tailwind-shadcn-base-ui.md) | 見た目は Tailwind CSS 4 で書き、動きのある部品は shadcn/ui（Base UI）をリポジトリに取り込んで使う | 採用 | エージェント |
| [0015](0015-timeline-fan-out-on-read.md) | タイムラインは読むときに組み立て、いいねなどの数は投稿の行に持つ | 採用 | エージェント |
| [0016](0016-time-ordered-64bit-post-ids.md) | 投稿の ID は、時刻の順に並ぶ 64 bit の整数をアプリで作り、外では文字列として扱う | 採用 | エージェント |
| [0017](0017-cloudflare-workers-opennext.md) | 本番は Cloudflare Workers で、Next.js そのものを OpenNext のアダプターで動かす | 採用 | ユーザー／エージェント |
| [0018](0018-resize-images-in-browser.md) | 画像の縮小と変換は送る前にブラウザで行い、サーバーでは変換しない | 採用（WebP にできないブラウザの扱いを ADR-0043 で置き換え） | エージェント |
| [0019](0019-first-milestone-runs-locally.md) | 最初のマイルストーンは「ローカルで全部が動く」とし、Cloudflare への配備はその次にする | 採用 | ユーザー |
| [0020](0020-ci-required-github-actions.md) | CI を必須とし、GitHub Actions で全部の確認を push と PR のたびに動かす | 採用（CI のコンテナの動かし方を ADR-0033 で置き換え） | ユーザー／エージェント |
| [0021](0021-coverage-100-percent.md) | テストのカバレッジは 100% を必須とし、測れない非同期の Server Component だけを薄くして外す | 採用（外すファイルのパスを ADR-0022 で置き換え） | ユーザー／エージェント |
| [0022](0022-feature-sliced-design.md) | コードは Feature-Sliced Design で分け、Next.js の `app/` はルートに置いてルーティングだけを持たせる | 採用（守らせ方の節を ADR-0030 で置き換え） | ユーザー／エージェント |
| [0023](0023-delivery-loop-one-pbi-at-a-time.md) | EPIC の子 issue は、決まった手順のループで 1 件ずつ、閉じるまで終わらせる | 採用（前提が崩れたときの扱いと `blocked` を ADR-0028 で置き換え） | ユーザー／エージェント |
| [0024](0024-definition-of-done-requires-browser-testing.md) | 完了の定義に、本物のブラウザでのテストを必ず含める | 採用（閉じるコメントに書く記録を ADR-0025 で試験レポートに置き換え） | ユーザー／エージェント |
| [0025](0025-test-report-with-evidence.md) | PBI を閉じるたびに、エビデンスつきの試験レポートを `docs/test-reports/` に残す | 採用 | ユーザー／エージェント |
| [0026](0026-implementation-is-always-test-driven.md) | 実装は必ずテスト駆動（TDD）で行い、失敗したテストの記録を残す | 採用 | ユーザー／エージェント |
| [0027](0027-independent-code-review-in-the-loop.md) | PBI ごとに、push の前に、独立した sub agent（opus）のコードレビューを受ける | 採用（3 回で `blocked` にする決まりを ADR-0028 で置き換え） | ユーザー／エージェント |
| [0028](0028-bugs-are-fixed-to-completion-without-asking.md) | 見つけたバグは、ループを止めず、ユーザーに確認を求めずに、その場で最後まで直し切る | 採用 | ユーザー／エージェント |
| [0029](0029-milestone-on-a-branch-when-a-pr-is-requested.md) | ユーザーが PR を求めたマイルストーンは、1 本のブランチで進め、issue はマージで閉じる | 採用 | ユーザー／エージェント |
| [0030](0030-fsd-lint-exceptions-and-own-layer-check.md) | Steiger の 2 つの決まりを範囲を絞って止め、`src/` の直下の層と、クライアントからのサーバーの読み込みは自前の確認で守る | 採用 | エージェント |
| [0031](0031-database-tests-per-worker-database-and-truncate.md) | データベースのテストは、ワーカーごとのデータベースを使い、テストごとに表を空にし、補助はリポジトリのルートの `test/` に置く | 採用 | エージェント |
| [0032](0032-pin-dependencies-published-at-least-seven-days-ago.md) | 依存は、公開から 7 日以上たった版に固定し、pnpm の新しい版の除外を使わない | 採用 | エージェント |
| [0033](0033-ci-services-via-docker-compose.md) | CI の PostgreSQL と Garage は、GitHub Actions の services: ではなく、手元と同じ Docker Compose で動かす | 採用 | エージェント |
| [0034](0034-foreign-keys-cascade-from-users-and-detach-thread-links.md) | 外部キーは、人を消すとその人のものを一緒に消し、投稿の間のつながりは外すだけにする | 採用 | エージェント |
| [0035](0035-vendor-shadcn-from-registry-and-base-ui-toast.md) | shadcn の部品は CLI を使わずレジストリの定義から取り込み、トーストは Base UI 版にする | 採用 | エージェント |
| [0036](0036-auth-rate-limit-configurable-for-e2e.md) | 登録とログインの回数の制限は、IP ごとに 1 分 10 回を既定にし、画面のテストのサーバーだけ環境変数で上げる | 採用 | エージェント |
| [0037](0037-pool-closes-when-idle-not-after-response.md) | リクエストごとの接続の pool は、after() で閉じず、使わなくなって 1 秒で接続を閉じる | 採用 | エージェント |
| [0038](0038-e2e-sign-up-per-test-and-direct-bulk-fixtures.md) | 画面のテストは、テストごとに画面から登録し、画面では作れない量のデータだけをデータベースへ直接入れる | 採用 | エージェント |
| [0039](0039-not-found-route-file-is-a-thin-shell.md) | 404 の画面は、アプリの not-found.tsx から同期の画面のコンポーネントを出し、Next.js の既定の画面を使わない | 採用 | エージェント |
| [0040](0040-bookmark-cursor-is-time-and-post-id.md) | ブックマークの一覧のカーソルは、付けた時刻のマイクロ秒と投稿の ID の組にする | 採用 | エージェント |
| [0041](0041-repost-and-quote-target-the-original.md) | リポストと引用の対象は、リポストの行なら元の投稿、返信ならその返信にする | 採用 | エージェント |
| [0042](0042-profile-routes-in-a-group-with-their-own-not-found.md) | プロフィールのルートは [username] の中のルートグループに置き、無いアカウントの 404 をそこだけに出す | 採用 | エージェント |
| [0043](0043-jpeg-where-the-browser-cannot-write-webp.md) | ブラウザが WebP を書けないときは、同じ品質の JPEG で送り、サーバーは JPEG も受け付ける | 採用 | エージェント |
| [0044](0044-client-inputs-take-in-what-was-entered-before-hydration.md) | 入力欄の値を状態に持つクライアントの部品は、マウントのときに DOM に入っている値を取り込む | 採用 | エージェント |
| [0045](0045-close-better-auth-write-endpoints-the-app-does-not-use.md) | Better Auth の HTTP の道のうち、アプリが使わない利用者の書き込みは閉じる | 採用 | エージェント |
| [0046](0046-ci-browser-tests-in-the-official-playwright-image.md) | CI の画面のテストは、公式の Playwright のイメージの中で、ランナーの Node.js で動かす | 採用 | ユーザー・エージェント |
