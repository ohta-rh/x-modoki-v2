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
| [0010](0010-dal-server-actions-route-handlers.md) | 読み書きはデータアクセス層に集め、変更は Server Action、続きの読み込みは Route Handler で行う | 採用（ファイルの置き場所を ADR-0022 で、誰が見ても同じ読み取りのキャッシュを ADR-0048 で置き換え） | エージェント |
| [0011](0011-polling-and-after-no-queue.md) | 新着と未読は定期的な確認で知らせ、あとの処理は同じトランザクションと `after()` で行い、キューを持たない | 採用（定期的な処理の呼び方を ADR-0017 で置き換え） | エージェント |
| [0012](0012-single-container-docker-compose.md) | `output: 'standalone'` のコンテナ 1 つで動かし、ローカルも本番も Docker Compose で同じ構成にする | 置き換え: ADR-0017 | エージェント |
| [0013](0013-vitest-playwright-testing.md) | 単体のテストは Vitest、画面を通したテストは Playwright で行い、データアクセス層は本物の PostgreSQL で試す | 採用 | エージェント |
| [0014](0014-tailwind-shadcn-base-ui.md) | 見た目は Tailwind CSS 4 で書き、動きのある部品は shadcn/ui（Base UI）をリポジトリに取り込んで使う | 採用 | エージェント |
| [0015](0015-timeline-fan-out-on-read.md) | タイムラインは読むときに組み立て、いいねなどの数は投稿の行に持つ | 採用 | エージェント |
| [0016](0016-time-ordered-64bit-post-ids.md) | 投稿の ID は、時刻の順に並ぶ 64 bit の整数をアプリで作り、外では文字列として扱う | 採用 | エージェント |
| [0017](0017-cloudflare-workers-opennext.md) | 本番は Cloudflare Workers で、Next.js そのものを OpenNext のアダプターで動かす | 採用 | ユーザー／エージェント |
| [0018](0018-resize-images-in-browser.md) | 画像の縮小と変換は送る前にブラウザで行い、サーバーでは変換しない | 採用（WebP にできないブラウザの扱いを ADR-0043 で置き換え） | エージェント |
| [0019](0019-first-milestone-runs-locally.md) | 最初のマイルストーンは「ローカルで全部が動く」とし、Cloudflare への配備はその次にする | 採用 | ユーザー |
| [0020](0020-ci-required-github-actions.md) | CI を必須とし、GitHub Actions で全部の確認を push と PR のたびに動かす | 置き換え: ADR-0070 | ユーザー／エージェント |
| [0021](0021-coverage-100-percent.md) | テストのカバレッジは 100% を必須とし、測れない非同期の Server Component だけを薄くして外す | 採用（外すファイルのパスを ADR-0022 で置き換え） | ユーザー／エージェント |
| [0022](0022-feature-sliced-design.md) | コードは Feature-Sliced Design で分け、Next.js の `app/` はルートに置いてルーティングだけを持たせる | 採用（守らせ方の節を ADR-0030 で置き換え） | ユーザー／エージェント |
| [0023](0023-delivery-loop-one-pbi-at-a-time.md) | EPIC の子 issue は、決まった手順のループで 1 件ずつ、閉じるまで終わらせる | 採用（前提が崩れたときの扱いと `blocked` を ADR-0028 で置き換え） | ユーザー／エージェント |
| [0024](0024-definition-of-done-requires-browser-testing.md) | 完了の定義に、本物のブラウザでのテストを必ず含める | 採用（閉じるコメントに書く記録を ADR-0025 で試験レポートに置き換え） | ユーザー／エージェント |
| [0025](0025-test-report-with-evidence.md) | PBI を閉じるたびに、エビデンスつきの試験レポートを `docs/test-reports/` に残す | 採用 | ユーザー／エージェント |
| [0026](0026-implementation-is-always-test-driven.md) | 実装は必ずテスト駆動（TDD）で行い、失敗したテストの記録を残す | 採用 | ユーザー／エージェント |
| [0027](0027-independent-code-review-in-the-loop.md) | PBI ごとに、push の前に、独立した sub agent（opus）のコードレビューを受ける | 採用（3 回で `blocked` にする決まりを ADR-0028 で置き換え） | ユーザー／エージェント |
| [0028](0028-bugs-are-fixed-to-completion-without-asking.md) | 見つけたバグは、ループを止めず、ユーザーに確認を求めずに、その場で最後まで直し切る | 採用（範囲の外のバグをバグの PBI にする決まりを ADR-0056 で置き換え） | ユーザー／エージェント |
| [0029](0029-milestone-on-a-branch-when-a-pr-is-requested.md) | ユーザーが PR を求めたマイルストーンは、1 本のブランチで進め、issue はマージで閉じる | 採用 | ユーザー／エージェント |
| [0030](0030-fsd-lint-exceptions-and-own-layer-check.md) | Steiger の 2 つの決まりを範囲を絞って止め、`src/` の直下の層と、クライアントからのサーバーの読み込みは自前の確認で守る | 採用 | エージェント |
| [0031](0031-database-tests-per-worker-database-and-truncate.md) | データベースのテストは、ワーカーごとのデータベースを使い、テストごとに表を空にし、補助はリポジトリのルートの `test/` に置く | 採用 | エージェント |
| [0032](0032-pin-dependencies-published-at-least-seven-days-ago.md) | 依存は、公開から 7 日以上たった版に固定し、pnpm の新しい版の除外を使わない | 採用 | エージェント |
| [0033](0033-ci-services-via-docker-compose.md) | CI の PostgreSQL と Garage は、GitHub Actions の services: ではなく、手元と同じ Docker Compose で動かす | 採用 | エージェント |
| [0034](0034-foreign-keys-cascade-from-users-and-detach-thread-links.md) | 外部キーは、人を消すとその人のものを一緒に消し、投稿の間のつながりは外すだけにする | 採用 | エージェント |
| [0035](0035-vendor-shadcn-from-registry-and-base-ui-toast.md) | shadcn の部品は CLI を使わずレジストリの定義から取り込み、トーストは Base UI 版にする | 採用 | エージェント |
| [0036](0036-auth-rate-limit-configurable-for-e2e.md) | 登録とログインの回数の制限は、IP ごとに 1 分 10 回を既定にし、画面のテストのサーバーだけ環境変数で上げる | 採用 | エージェント |
| [0037](0037-pool-closes-when-idle-not-after-response.md) | リクエストごとの接続の pool は、after() で閉じず、使わなくなって 1 秒で接続を閉じる | 採用（使わなくなった接続を閉じるまでの時間を ADR-0050 で 100ms に置き換え） | エージェント |
| [0038](0038-e2e-sign-up-per-test-and-direct-bulk-fixtures.md) | 画面のテストは、テストごとに画面から登録し、画面では作れない量のデータだけをデータベースへ直接入れる | 採用 | エージェント |
| [0039](0039-not-found-route-file-is-a-thin-shell.md) | 404 の画面は、アプリの not-found.tsx から同期の画面のコンポーネントを出し、Next.js の既定の画面を使わない | 採用 | エージェント |
| [0040](0040-bookmark-cursor-is-time-and-post-id.md) | ブックマークの一覧のカーソルは、付けた時刻のマイクロ秒と投稿の ID の組にする | 採用 | エージェント |
| [0041](0041-repost-and-quote-target-the-original.md) | リポストと引用の対象は、リポストの行なら元の投稿、返信ならその返信にする | 採用 | エージェント |
| [0042](0042-profile-routes-in-a-group-with-their-own-not-found.md) | プロフィールのルートは [username] の中のルートグループに置き、無いアカウントの 404 をそこだけに出す | 採用 | エージェント |
| [0043](0043-jpeg-where-the-browser-cannot-write-webp.md) | ブラウザが WebP を書けないときは、同じ品質の JPEG で送り、サーバーは JPEG も受け付ける | 採用 | エージェント |
| [0044](0044-client-inputs-take-in-what-was-entered-before-hydration.md) | 入力欄の値を状態に持つクライアントの部品は、マウントのときに DOM に入っている値を取り込む | 採用 | エージェント |
| [0045](0045-close-better-auth-write-endpoints-the-app-does-not-use.md) | Better Auth の HTTP の道のうち、アプリが使わない利用者の書き込みは閉じる | 採用 | エージェント |
| [0046](0046-ci-browser-tests-in-the-official-playwright-image.md) | CI の画面のテストは、公式の Playwright のイメージの中で、ランナーの Node.js で動かす | 採用（「7 番目だけ」を ADR-0047 で置き換え） | ユーザー・エージェント |
| [0047](0047-ci-steps-that-launch-a-browser-run-in-the-playwright-image.md) | CI でブラウザを立ち上げる確認は、どれも公式の Playwright のイメージの中で動かす | 採用 | エージェント |
| [0048](0048-read-trends-and-suggestions-per-request.md) | トレンドとおすすめのユーザーは 'use cache' で持たず、要求ごとに読む | 採用 | エージェント |
| [0049](0049-e2e-scrolls-at-once-not-by-wheel.md) | 画面のテストは、ホイールではなく一度に動かしてスクロールする | 採用 | エージェント |
| [0050](0050-idle-connections-close-after-100ms.md) | 使わなくなった接続は 100ms で閉じる | 採用 | エージェント |
| [0051](0051-theme-from-a-head-script-not-the-root-layout.md) | テーマとアクセントの色は、ルートのレイアウトではなく head の小さなスクリプトで html に付ける | 採用 | エージェント |
| [0052](0052-local-webkit-in-the-playwright-image.md) | macOS の手元では、画面のテストの WebKit を CI と同じ Playwright のイメージで動かす | 採用 | エージェント |
| [0053](0053-requirements-trace-to-tests.md) | 全部の要件を、通っているテストに結びつけ、CI の最初の確認で確かめる | 採用 | エージェント |
| [0054](0054-text-and-fill-colours-meet-wcag-contrast.md) | 文字と塗りに使う色は、X の色を背景と 4.5:1 以上の差がある最も近い濃さに変える | 採用 | エージェント |
| [0055](0055-axe-runs-on-chromium-and-webkit.md) | 画面のアクセシビリティの検査（axe）は、Chromium と WebKit で流し、Firefox では流さない | 採用 | ユーザー |
| [0056](0056-bugs-fixed-inside-the-pbi-and-lighter-local-checks.md) | PBI の中で見つけたバグはその PBI の中で直し、バグの issue は探索的テストの分だけにし、手元の全部の確認は push の前に 1 回にする | 採用 | ユーザー |
| [0057](0057-db-connect-gives-up-after-1-5s-and-retries-once.md) | データベースへの新しい接続は 1.5 秒で待つのをやめ、1 回だけつなぎ直す | 採用 | エージェント |
| [0058](0058-measure-speed-with-applied-throttling.md) | 画面の速さは、Lighthouse のモバイルの回線と CPU の条件を実際にかけて測り、3 回の中央の値で判定する | 採用 | エージェント |
| [0059](0059-load-popups-and-parsers-on-first-use.md) | メニュー・ダイアログ・ホバーカード・トーストと投稿の解析は、使うときに読み込み、最初に送る JavaScript を e2e で 200KB 以下に保つ | 採用 | エージェント |
| [0060](0060-every-entry-has-tagged-authorization-tests.md) | 全ての入口に、印の付いた認可のテストを求め、lint で突き合わせる | 採用 | エージェント |
| [0061](0061-security-headers-and-content-security-policy.md) | 全ての応答にセキュリティのヘッダーを付け、CSP は自分のサイト・画像の配信元・ストレージの口だけを許し、インラインのスクリプトは許す | 採用 | エージェント |
| [0062](0062-error-screens-are-thin-route-shells.md) | 誤りの画面は、アプリの error.tsx と global-error.tsx から日本語の同期の画面を出し、ボタンでページを読み込み直す | 採用 | エージェント |
| [0063](0063-proxy-answers-undecodable-paths-with-404.md) | 解読できない % を含むパスは、proxy.ts で 404 の画面へ書き換える | 採用 | エージェント |
| [0064](0064-a-repeated-post-within-a-minute-returns-the-first.md) | 同じ人が 1 分以内に同じ投稿をもう一度送ったら、新しく作らずに前の投稿を返す | 採用 | エージェント |
| [0065](0065-client-calls-of-server-actions-take-their-failure.md) | ブラウザからの Server Action の呼び出しは必ず失敗を受け、ESLint の自前のルールで止める | 採用 | エージェント |
| [0066](0066-deleting-an-already-deleted-own-post-succeeds.md) | もう消した自分の投稿の削除は、やり直しとして成功を返す | 置き換え: ADR-0067 | エージェント |
| [0067](0067-retried-deletes-and-profile-images-return-the-same-result.md) | 削除とプロフィールの画像の保存は、やり直しても同じ結果を返す | 採用 | エージェント |
| [0068](0068-seed-people-sign-in-with-a-published-dev-password.md) | シードの人は、公開した開発用のパスワードでログインできる | 採用 | エージェント |
| [0069](0069-ci-runs-the-local-guide-on-a-fresh-clone.md) | CI はまっさらなランナーで手順書のコマンドをそのまま流して確かめる | 採用 | エージェント |
| [0070](0070-ci-has-eight-gates-with-the-dependency-audit.md) | CI の確認を 8 つにし、本番の依存の監査を最初に動かす | 採用 | エージェント |
| [0071](0071-dependabot-weekly-updates-pinned-lines-by-adr.md) | 依存の更新は Dependabot が週に 1 回 PR にし、ADR が固定した系列は ADR でだけ上げる | 採用 | エージェント |
| [0072](0072-docs-checked-on-the-staged-tree-before-commit.md) | commit の前に、ステージした木でドキュメントの確認を動かす | 採用 | エージェント |
