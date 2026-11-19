# 2026-11-18 の調査

* [Next.js と周辺ツールチェーンの現状](nextjs.md) - Next.js 16.4 と React・TypeScript・lint・テスト・UI の道具の、2026-11-18 の時点の版と状態を調べた結果。
* [バックエンド技術選定（DB / ORM / 認証 / ストレージ / リアルタイム / ジョブ / デプロイ）](backend.md) - データベース・ORM・認証・画像の置き場所・リアルタイム・ジョブ・配備の候補を、2026-11-18 の時点の版と料金で比べた結果。
* [X (x.com) Web UI/UX 仕様調査](x-uiux.md) - X の Web 版のレイアウト・配色・部品・操作・URL の形と、名前やロゴを使うときの制約を、2026-11-18 に公開の情報から調べた結果。
* [Next.js 16.4 を Cloudflare Workers で動かす方法の調査](cloudflare.md) - Next.js 16.4 を Cloudflare Workers で動かす手段（OpenNext と vinext）、対応している機能、Workers・Hyperdrive・Images の制限と料金を、2026-11-18 に公式の情報で調べた結果。
* [Better Auth 1.7 を Next.js 16.4 で動かした結果](better-auth-on-next-16.md) - Better Auth 1.7.25 と Drizzle と PostgreSQL を、Cache Components を有効にした Next.js 16.4.6 で動かし、登録からログアウトまでと `proxy.ts` を確かめた結果と、動かすのに要った設定。
* [Garage v2.5 に、署名つき URL でブラウザから直接送った結果](garage-presigned-upload.md) - Docker Compose の Garage v2.5.0 に、AWS SDK v3 の署名つき URL でブラウザから WebP を PUT し、公開の URL で読み出し、大きさの違い・期限切れ・別のオリジンが拒まれることを確かめた結果と設定。
* [FSD の構成を Next.js 16.4 で動かした結果](fsd-on-next-16.md) - ルートの `app/` と `src/` の 6 つの層の構成で、Next.js 16.4.6 のビルド・`proxy.ts`・TanStack Query の `initialData`・Steiger・ESLint・Vitest のカバレッジが設計どおりに働くかを確かめた結果と、動いた設定の全文。
* [負荷の下で要求が返らない原因（#55）](db-connect-stalls.md) - 全部の画面のテストを並べたときにまれに要求が返らない原因を、中継とアプリの中の見張りで追い、PostgreSQL への新しい接続が OrbStack の公開の口の奥で秒の単位で遅れ、上限の無い接続の待ちがそのまま要求を止めていたことを突き止めた記録。
