# ドキュメントの更新の履歴

## 2026-11-19
* **New**: [#31 の試験レポート](test-reports/issue-0031-wcag-aa.md)（WCAG 2.2 AA とキーボード）。
* **New**: [ADR-0056](adr/0056-bugs-fixed-inside-the-pbi-and-lighter-local-checks.md)（中で見つけたバグは中で直す、バグの issue は探索的テストの分だけ、手元の全部の確認は push の前に 1 回）。ADR-0028 の一部を置き換えた。
* **New**: [ADR-0054](adr/0054-text-and-fill-colours-meet-wcag-contrast.md)（文字と塗りの色は、4.5:1 以上の最も近い濃さ）、[ADR-0055](adr/0055-axe-runs-on-chromium-and-webkit.md)（axe は Chromium と WebKit で）。[UI/UX 仕様](architecture/ui-ux.md)の 4 節と 10 節を直した（#31）。
* **New**: [#30 の試験レポート](test-reports/issue-0030-requirements-traceability.md)（全部の要件をテストに結びつける）。
* **New**: [#62 の試験レポート](test-reports/issue-0062-unknown-filter-400.md)（知らない f と tab は 400）。
* **New**: [#63 の試験レポート](test-reports/issue-0063-reduced-motion.md)（動きを減らす設定）。
* **New**: [#64 の試験レポート](test-reports/issue-0064-toast-region-name.md)（トーストの置き場の名前）。
* **New**: [#60 の試験レポート](test-reports/issue-0060-server-rendered-feed.md)（投稿の一覧をサーバーの HTML に入れる）。
* **New**: [#61 の試験レポート](test-reports/issue-0061-local-webkit-in-image.md)（macOS の手元の WebKit を CI と同じイメージで）。
* **New**: [ADR-0052](adr/0052-local-webkit-in-the-playwright-image.md)（macOS の手元では、画面のテストの WebKit を CI と同じ Playwright のイメージで動かす）（#61）。
* **New**: [要件とテストの対応](requirements/traceability.md)（#30）。
* **New**: [ADR-0053](adr/0053-requirements-trace-to-tests.md)（全部の要件を、通っているテストに結びつける）（#30）。
* **New**: [#29 の試験レポート](test-reports/issue-0029-keyboard-settings.md)（キーボード・表示の設定・設定の 2 ペイン）。
* **New**: [#59 の試験レポート](test-reports/issue-0059-db-connections.md)（データベースの接続の上限）。
* **New**: [ADR-0050](adr/0050-idle-connections-close-after-100ms.md)（使わなくなった接続は 100ms で閉じる）。ADR-0037 の 1 秒を置き換えた（#59）。
* **New**: [ADR-0051](adr/0051-theme-from-a-head-script-not-the-root-layout.md)（テーマとアクセントの色は head の小さなスクリプトで html に付ける）（#29）。
* **New**: [#28 の試験レポート](test-reports/issue-0028-composer-new-posts.md)（投稿のモーダル・新しい投稿の知らせ・さらに表示）。
* **New**: [ADR-0049](adr/0049-e2e-scrolls-at-once-not-by-wheel.md)（画面のテストは、ホイールではなく一度に動かしてスクロールする）。
* **Update**: [UI/UX 仕様](architecture/ui-ux.md)の 5 節に、長い本文を 8 行で切り詰める決まりを書いた（#28）。
* **New**: [#57 の試験レポート](test-reports/issue-0057-close-labels.md)。
* **New**: [#58 の試験レポート](test-reports/issue-0058-right-sidebar-scroll.md)。
* **Update**: [UI/UX 仕様](architecture/ui-ux.md)の 7 節に、下書きは本文だけをそのブラウザの中に持つことを書いた（#28）。
* **New**: [#56 の試験レポート](test-reports/issue-0056-photo-viewer-test-scroll.md)（画像のビューアの画面のテストの揺らぎ）。
* **New**: [#27 の試験レポート](test-reports/issue-0027-search.md)（検索・トレンド・おすすめのユーザー）。

## 2026-11-18
* **New**: [ADR-0048](adr/0048-read-trends-and-suggestions-per-request.md)（トレンドとおすすめのユーザーは要求ごとに読む）を足し、ADR-0010 のキャッシュの部分を置き換えた。[アプリの構成](architecture/application-structure.md)を直した（#27）。
* **New**: [#26 の試験レポート](test-reports/issue-0026-notifications.md)（通知と未読の数）を足した。
* **New**: [#54 の試験レポート](test-reports/issue-0054-four-image-message.md)（「4 枚まで」の知らせ）を足した。
* **New**: [#53 の試験レポート](test-reports/issue-0053-follow-list-pages.md)（フォローの一覧の続き）を足した。
* **New**: [#52 の試験レポート](test-reports/issue-0052-ci-playwright-image.md)（CI の画面のテストを公式の Playwright のイメージで）を足した。
* **New**: [ADR-0047](adr/0047-ci-steps-that-launch-a-browser-run-in-the-playwright-image.md)（ブラウザを立ち上げる確認はどれもイメージの中で）を足し、ADR-0046 の「7 番目だけ」を置き換えた（#52）。
* **New**: [ADR-0046](adr/0046-ci-browser-tests-in-the-official-playwright-image.md)（CI の画面のテストは公式の Playwright のイメージで）を足し、[環境と配備](architecture/environments.md)の CI の表を直した（#52）。
* **New**: [#51 の試験レポート](test-reports/issue-0051-auth-write-endpoints.md)（使っていない Better Auth の書き込みの道）を足した。
* **New**: [#25 の試験レポート](test-reports/issue-0025-media.md)（画像の添付・ビューア・アバターとバナー・片付け）を足した。
* **New**: [ADR-0045](adr/0045-close-better-auth-write-endpoints-the-app-does-not-use.md)（使わない Better Auth の書き込みの道を閉じる）と[脅威モデル](architecture/threat-model.md)の T-21 を足した（#51）。
* **New**: [ADR-0044](adr/0044-client-inputs-take-in-what-was-entered-before-hydration.md)（入力欄の値を状態に持つ部品は、マウントのときに DOM の値を取り込む）を足した。
* **Update**: [脅威モデル](architecture/threat-model.md)の T-07 に、結びつけるときに写してから確かめることを書いた（#25 レビュー 2）。
* **New**: [#50 の試験レポート](test-reports/issue-0050-follow-test-wait.md)（フォローの画面のテストの待ち方）を足した。
* **New**: [#49 の試験レポート](test-reports/issue-0049-postgres-connections.md)（PostgreSQL の接続の数の上限）を足した。
* **New**: [#48 の試験レポート](test-reports/issue-0048-feed-row-heights.md)（タイムラインのカードの重なり）を足した。
* **Update**: [環境と配備](architecture/environments.md)に、ローカルと CI の PostgreSQL の `max_connections` を書いた（#49）。
* **Update**: [環境と配備](architecture/environments.md)に、ローカルのバケットの CORS を書いた（#25）。
* **New**: [ADR-0043](adr/0043-jpeg-where-the-browser-cannot-write-webp.md)（Safari では JPEG で送る）を記録し、ADR-0018 の一部を置き換え、[脅威の文書](architecture/threat-model.md)の T-07 を直した（#25）。
* **New**: [#24 の試験レポート](test-reports/issue-0024-follow.md)（フォロー）を足した。
* **Update**: [ルーティング](architecture/routing.md)の 2 節と[アプリケーションの構造](architecture/application-structure.md)の 5 節に、フォローの一覧を書いた（#24）。
* **New**: [#23 の試験レポート](test-reports/issue-0023-profile.md)（プロフィール）を足した。
* **New**: [ADR-0042](adr/0042-profile-routes-in-a-group-with-their-own-not-found.md)（プロフィールのルートと 404）を記録し、[ルーティング](architecture/routing.md)の 2 節と[アプリケーションの構造](architecture/application-structure.md)の 5 節を直した（#23）。
* **New**: [#22 の試験レポート](test-reports/issue-0022-repost-quote.md)（リポストと引用）を足した。
* **New**: [#47 の試験レポート](test-reports/issue-0047-prehydration-input.md)（ハイドレーションの前に打った文字）を足した。
* **New**: [ADR-0041](adr/0041-repost-and-quote-target-the-original.md)（リポストと引用の対象）を記録し、[アプリケーションの構造](architecture/application-structure.md)の 5 節に `repostedBy` と `quoted` の形を書いた（#22）。
* **New**: [#21 の試験レポート](test-reports/issue-0021-reactions.md)（いいね・ブックマーク・表示の回数）を足した。
* **New**: [ADR-0040](adr/0040-bookmark-cursor-is-time-and-post-id.md)（ブックマークの一覧のカーソル）を記録し、[アプリケーションの構造](architecture/application-structure.md)の 5 節を直した（#21）。
* **New**: [#20 の試験レポート](test-reports/issue-0020-post-detail.md)（投稿の詳細・返信・削除）を足した。
* **New**: [#46 の試験レポート](test-reports/issue-0046-rate-limit-test-clock.md)（回数の制限のテストの時計）を足し、[#45 の試験レポート](test-reports/issue-0045-ci-deb-cache.md)に再試験を足した。
* **New**: [ADR-0039](adr/0039-not-found-route-file-is-a-thin-shell.md)（404 の画面と not-found.tsx）を記録し、[アプリケーションの構造](architecture/application-structure.md)の 2 節と 5 節を直した（#20）。
* **New**: [#45 の試験レポート](test-reports/issue-0045-ci-deb-cache.md)（CI の .deb のキャッシュ）を足した。
* **New**: [#19 の試験レポート](test-reports/issue-0019-home-timeline.md)（投稿とホームのタイムライン）を足した。
* **Update**: [UI/UX 仕様](architecture/ui-ux.md)の 10 節に、枠の無いテキストの入力欄はフォーカスの輪を出さない例外を書いた（#19）。
* **New**: [ADR-0038](adr/0038-e2e-sign-up-per-test-and-direct-bulk-fixtures.md)（画面のテストの登録と前提のデータ）を記録し、[テストの設計](architecture/test-strategy.md)の 5 節を直した（#19）。
* **New**: [#18 の試験レポート](test-reports/issue-0018-auth.md)（登録・ログイン・ログアウト）と [#44 の試験レポート](test-reports/issue-0044-ci-root-timeout.md)（CI の apt の上限）を足した。
* **New**: [ADR-0036](adr/0036-auth-rate-limit-configurable-for-e2e.md)（登録とログインの回数の制限）と [ADR-0037](adr/0037-pool-closes-when-idle-not-after-response.md)（接続の pool の閉じ方）を記録し、[環境と配備](architecture/environments.md)と[アプリケーションの構造](architecture/application-structure.md)を直した（#18）。
* **New**: [#43 の試験レポート](test-reports/issue-0043-ci-browser-setup.md)（CI のブラウザの準備）を足した。
* **New**: [#17 の試験レポート](test-reports/issue-0017-app-shell.md)（3 カラムの骨格とテーマ）を足した。
* **New**: [ADR-0035](adr/0035-vendor-shadcn-from-registry-and-base-ui-toast.md)（shadcn の部品の取り込み方とトースト）を記録し、[技術スタック](architecture/tech-stack.md)に UI の依存の版を書いた（#17）。
* **New**: [#16 の試験レポート](test-reports/issue-0016-schema-and-seed.md)（データベースの表・マイグレーション・シード）を足した。
* **Update**: [データモデル](architecture/data-model.md)のユーザーの検索の索引を、実装の式（`coalesce(username, '')`）に合わせた（#16 のレビュー）。
* **New**: [ADR-0034](adr/0034-foreign-keys-cascade-from-users-and-detach-thread-links.md)（外部キーの消し方と、新しい順の索引の向き）を記録し、[データモデル](architecture/data-model.md)と[テストの設計](architecture/test-strategy.md)を実装に合わせた（#16）。
* **New**: [#15 の試験レポート](test-reports/issue-0015-scaffold-and-ci.md)（アプリの骨組みと CI の 7 つの確認）を足した。
* **New**: [ADR-0033](adr/0033-ci-services-via-docker-compose.md)（CI の PostgreSQL と Garage は手元と同じ Docker Compose で動かす。ADR-0020 の一部を置き換え）を記録した（#15）。
* **Update**: 骨組みに合わせて[環境と配備](architecture/environments.md)と[技術スタック](architecture/tech-stack.md)を直し、[ADR-0032](adr/0032-pin-dependencies-published-at-least-seven-days-ago.md)（依存は公開から 7 日以上たった版に固定）を記録した（#15）。
* **Creation**: [脅威の洗い出し](architecture/threat-model.md)を置いた（#14、[試験レポート](test-reports/issue-0014-threat-model.md)）。
* **Creation**: [テストの設計](architecture/test-strategy.md)と [ADR-0031](adr/0031-database-tests-per-worker-database-and-truncate.md)（データベースのテストの切り離し方）を置いた（#13、[試験レポート](test-reports/issue-0013-test-strategy.md)）。
* **Creation**: [FSD の構成を Next.js 16.4 で動かした結果](research/fsd-on-next-16.md)を置き、[ADR-0030](adr/0030-fsd-lint-exceptions-and-own-layer-check.md) で [ADR-0022](adr/0022-feature-sliced-design.md) の守らせ方を置き換えた（#12、[試験レポート](test-reports/issue-0012-fsd-spike.md)）。
* **Creation**: [Garage に署名つき URL で送った結果](research/garage-presigned-upload.md)を置いた（#11、[試験レポート](test-reports/issue-0011-garage-spike.md)）。
* **Creation**: [Better Auth を Next.js 16.4 で動かした結果](research/better-auth-on-next-16.md)を置いた（#10、[試験レポート](test-reports/issue-0010-better-auth-spike.md)）。
* **Creation**: [機能でない要件](requirements/non-functional.md)を置いた（#9、[試験レポート](test-reports/issue-0009-non-functional-requirements.md)）。
* **Creation**: [機能の要件](requirements/functional.md)を置いた（#8、[試験レポート](test-reports/issue-0008-functional-requirements.md)）。
* **Creation**: [ADR-0029](adr/0029-milestone-on-a-branch-when-a-pr-is-requested.md)（PR を求められたマイルストーンはブランチで進める）を記録した。
* **Creation**: [試験レポート](test-reports/2026-11-18-bug-handling-rule.md)を置いた（バグのルールと、issue の本文への反映の確認）。
* **Creation**: [ADR-0028](adr/0028-bugs-are-fixed-to-completion-without-asking.md)（バグは止めず・聞かずに最後まで直す）を記録した。[ADR-0023](adr/0023-delivery-loop-one-pbi-at-a-time.md) と [ADR-0027](adr/0027-independent-code-review-in-the-loop.md) の `blocked` の決まりを置き換えた。
* **Creation**: [試験レポート](test-reports/2026-11-18-tdd-and-code-review.md)を置いた。独立したコードレビュー 3 回で `scripts/check-docs.mjs` の欠け 14 件を直し、テストを 51 件にした。
* **Creation**: [ADR-0027](adr/0027-independent-code-review-in-the-loop.md)（push の前に、独立した sub agent のコードレビューを受ける）を記録した。完了の定義は 10 項目になった。
* **Creation**: [ADR-0026](adr/0026-implementation-is-always-test-driven.md)（実装は必ず TDD で行い、赤の記録を試験レポートに残す）を記録した。完了の定義は 9 項目になった。
* **Creation**: 最初の[試験レポート](test-reports/2026-11-18-harness-and-m1-issues.md)を置いた。Chrome で見て、issue のタスクの一覧のタイトルの重複を見つけて直した。
* **Creation**: [ADR-0025](adr/0025-test-report-with-evidence.md)（PBI を閉じるたびに、エビデンスつきの試験レポートを残す）を記録した。完了の定義は 8 項目になった。
* **Creation**: [ADR-0024](adr/0024-definition-of-done-requires-browser-testing.md)（完了の定義に、本物のブラウザでのテストを必ず含め、全ての PBI の本文に書く）を記録した。
* **Update**: コードの分け方を Feature-Sliced Design に変えた。[ADR-0022](adr/0022-feature-sliced-design.md) が [ADR-0010](adr/0010-dal-server-actions-route-handlers.md) の置き場所と [ADR-0021](adr/0021-coverage-100-percent.md) の外すパスを置き換えた。[アプリケーションの構造](architecture/application-structure.md) を書き直した。
* **Creation**: [ADR-0023](adr/0023-delivery-loop-one-pbi-at-a-time.md)（EPIC の子 issue を 1 件ずつ終わらせるループ）を記録した。
* **Update**: 本番を Cloudflare Workers に変えた。[ADR-0017](adr/0017-cloudflare-workers-opennext.md) が [ADR-0012](adr/0012-single-container-docker-compose.md) を置き換え、[ADR-0018](adr/0018-resize-images-in-browser.md) が画像の変換をブラウザに移した。根拠は [Cloudflare Workers で動かす方法の調査](research/cloudflare.md)。
* **Deprecation**: [ADR-0012](adr/0012-single-container-docker-compose.md)（1 台の VPS と Docker Compose）を置き換えた。
* **Creation**: 進め方と品質の決定を記録した。[ADR-0019](adr/0019-first-milestone-runs-locally.md)（最初のマイルストーンはローカル）、[ADR-0020](adr/0020-ci-required-github-actions.md)（CI は必須）、[ADR-0021](adr/0021-coverage-100-percent.md)（カバレッジ 100%）。
* **Update**: 設計書を新しい決定に合わせた。[全体像](architecture/overview.md)、[技術スタック](architecture/tech-stack.md)、[アプリケーションの構造](architecture/application-structure.md)、[データモデル](architecture/data-model.md)、[環境と配備](architecture/environments.md)、[機能の範囲](architecture/scope.md)。
* **Creation**: `docs/` を OKF v0.2 のバンドルとして作った（[ADR-0002](adr/0002-docs-as-okf-bundle.md)）。
* **Creation**: 進め方の決定を記録した。[ADR-0001](adr/0001-record-architecture-decisions.md)（ADR を残す）、[ADR-0003](adr/0003-pbi-epic-issues-with-root-cause.md)（PBI 型の EPIC と根本原因）。
* **Creation**: 調査の結果を置いた。[Next.js と周辺の道具](research/nextjs.md)、[バックエンドの技術選定](research/backend.md)、[X の Web UI/UX](research/x-uiux.md)。
* **Creation**: 技術と構造の決定を記録した。[ADR-0004](adr/0004-nextjs-16-all-in-one-app.md)、[ADR-0005](adr/0005-toolchain-node24-pnpm-ts6-eslint.md)、[ADR-0006](adr/0006-postgresql-drizzle.md)、[ADR-0007](adr/0007-better-auth-db-sessions.md)、[ADR-0008](adr/0008-s3-compatible-media-storage.md)、[ADR-0009](adr/0009-mimic-x-ui-with-own-brand.md)、[ADR-0010](adr/0010-dal-server-actions-route-handlers.md)、[ADR-0011](adr/0011-polling-and-after-no-queue.md)、[ADR-0012](adr/0012-single-container-docker-compose.md)、[ADR-0013](adr/0013-vitest-playwright-testing.md)、[ADR-0014](adr/0014-tailwind-shadcn-base-ui.md)、[ADR-0015](adr/0015-timeline-fan-out-on-read.md)、[ADR-0016](adr/0016-time-ordered-64bit-post-ids.md)。
* **Creation**: 設計書を置いた。[全体像](architecture/overview.md)、[技術スタック](architecture/tech-stack.md)、[アプリケーションの構造](architecture/application-structure.md)、[ルーティング](architecture/routing.md)、[データモデル](architecture/data-model.md)、[UI/UX 仕様](architecture/ui-ux.md)、[機能の範囲](architecture/scope.md)、[環境と配備](architecture/environments.md)。
