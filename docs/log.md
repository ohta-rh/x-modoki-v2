# ドキュメントの更新の履歴

## 2026-11-18
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
