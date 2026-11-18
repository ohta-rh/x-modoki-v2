# ドキュメントの更新の履歴

## 2026-11-18
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
* **Creation**: 技術と構造の決定を記録した。[ADR-0004](adr/0004-nextjs-16-all-in-one-app.md) から [ADR-0016](adr/0016-time-ordered-64bit-post-ids.md) まで。
* **Creation**: 設計書を置いた。[全体像](architecture/overview.md)、[技術スタック](architecture/tech-stack.md)、[アプリケーションの構造](architecture/application-structure.md)、[ルーティング](architecture/routing.md)、[データモデル](architecture/data-model.md)、[UI/UX 仕様](architecture/ui-ux.md)、[機能の範囲](architecture/scope.md)、[環境と配備](architecture/environments.md)。
