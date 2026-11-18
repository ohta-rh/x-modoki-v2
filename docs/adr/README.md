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
| [0006](0006-postgresql-drizzle.md) | データは PostgreSQL に置き、Drizzle ORM 0.45 系で読み書きする | 採用 | エージェント |
| [0007](0007-better-auth-db-sessions.md) | 認証は Better Auth を使い、セッションはデータベースに持つ | 採用 | エージェント |
| [0008](0008-s3-compatible-media-storage.md) | 画像は S3 互換のストレージに、署名つき URL でブラウザから直接送る | 採用 | エージェント |
| [0009](0009-mimic-x-ui-with-own-brand.md) | UI と操作は X の Web 版に合わせ、名前・ロゴ・アイコン・フォント・データは自前のものにする | 採用 | ユーザー／エージェント |
| [0010](0010-dal-server-actions-route-handlers.md) | 読み書きはデータアクセス層に集め、変更は Server Action、続きの読み込みは Route Handler で行う | 採用 | エージェント |
| [0011](0011-polling-and-after-no-queue.md) | 新着と未読は定期的な確認で知らせ、あとの処理は同じトランザクションと `after()` で行い、キューを持たない | 採用 | エージェント |
| [0012](0012-single-container-docker-compose.md) | `output: 'standalone'` のコンテナ 1 つで動かし、ローカルも本番も Docker Compose で同じ構成にする | 採用 | エージェント |
| [0013](0013-vitest-playwright-testing.md) | 単体のテストは Vitest、画面を通したテストは Playwright で行い、データアクセス層は本物の PostgreSQL で試す | 採用 | エージェント |
| [0014](0014-tailwind-shadcn-base-ui.md) | 見た目は Tailwind CSS 4 で書き、動きのある部品は shadcn/ui（Base UI）をリポジトリに取り込んで使う | 採用 | エージェント |
| [0015](0015-timeline-fan-out-on-read.md) | タイムラインは読むときに組み立て、いいねなどの数は投稿の行に持つ | 採用 | エージェント |
| [0016](0016-time-ordered-64bit-post-ids.md) | 投稿の ID は、時刻の順に並ぶ 64 bit の整数をアプリで作り、外では文字列として扱う | 採用 | エージェント |
