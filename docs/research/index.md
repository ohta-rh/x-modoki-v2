# 2026-11-18 の調査

* [Next.js と周辺ツールチェーンの現状](nextjs.md) - Next.js 16.4 と React・TypeScript・lint・テスト・UI の道具の、2026-11-18 の時点の版と状態を調べた結果。
* [バックエンド技術選定（DB / ORM / 認証 / ストレージ / リアルタイム / ジョブ / デプロイ）](backend.md) - データベース・ORM・認証・画像の置き場所・リアルタイム・ジョブ・配備の候補を、2026-11-18 の時点の版と料金で比べた結果。
* [X (x.com) Web UI/UX 仕様調査](x-uiux.md) - X の Web 版のレイアウト・配色・部品・操作・URL の形と、名前やロゴを使うときの制約を、2026-11-18 に公開の情報から調べた結果。
* [Next.js 16.4 を Cloudflare Workers で動かす方法の調査](cloudflare.md) - Next.js 16.4 を Cloudflare Workers で動かす手段（OpenNext と vinext）、対応している機能、Workers・Hyperdrive・Images の制限と料金を、2026-11-18 に公式の情報で調べた結果。
* [Better Auth 1.7 を Next.js 16.4 で動かした結果](better-auth-on-next-16.md) - Better Auth 1.7.25 と Drizzle と PostgreSQL を、Cache Components を有効にした Next.js 16.4.6 で動かし、登録からログアウトまでと `proxy.ts` を確かめた結果と、動かすのに要った設定。
* [Garage v2.5 に、署名つき URL でブラウザから直接送った結果](garage-presigned-upload.md) - Docker Compose の Garage v2.5.0 に、AWS SDK v3 の署名つき URL でブラウザから WebP を PUT し、公開の URL で読み出し、大きさの違い・期限切れ・別のオリジンが拒まれることを確かめた結果と設定。
* [FSD の構成を Next.js 16.4 で動かした結果](fsd-on-next-16.md) - ルートの `app/` と `src/` の 6 つの層の構成で、Next.js 16.4.6 のビルド・`proxy.ts`・TanStack Query の `initialData`・Steiger・ESLint・Vitest のカバレッジが設計どおりに働くかを確かめた結果と、動いた設定の全文。
* [負荷の下で要求が返らない原因（#55）](db-connect-stalls.md) - 全部の画面のテストを並べたときにまれに要求が返らない原因を、中継とアプリの中の見張りで追い、PostgreSQL への新しい接続が OrbStack の公開の口の奥で秒の単位で遅れ、上限の無い接続の待ちがそのまま要求を止めていたことを突き止めた記録。
* [マイルストーン 1 の速さの計測（#32）](performance-m1.md) - ローカルの本番ビルドで 5 つの主な画面の LCP・CLS・TBT、ホームの問い合わせの回数、最初に送る JavaScript、投稿 10 万件での「フォロー中」の問い合わせを測り、予算を超えた JavaScript の量を直した前と後の値。
* [マイルストーン 1 の探索的テスト（#34）](exploratory-m1.md) - ローカルの本番ビルドに 6 つの見方（連打と二重の送信、長い・変わった入力、戻る・進む・再読み込み、複数のタブとユーザー、狭い画面と拡大、通信の切断）で触り、見つけた不具合とその直し方、問題の無かったことを記録したもの。
* [マイルストーン 1 の振り返り](retrospective-m1.md) - マイルストーン 1 の issue・途中で足した ADR・試験レポート・CI の記録を読み、前提が崩れた 11 件・ルールがあいまいだった 9 件・やり直した 11 件に分け、項目ごとにルールか ADR を変えたか、変えない理由を記録する。
