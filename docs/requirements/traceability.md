---
type: Reference
title: "要件とテストの対応"
description: "全ての FR- と NFR- の要件、とルーティングの全ての URL について、満たす PBI と確かめるテストを並べた表で、scripts/check-traceability.mjs が CI で確かめる（ADR-0053）。"
tags: [requirements, testing, traceability]
status: stable
---

# 要件とテストの対応

要件の ID ごとに、満たす PBI と、確かめるテスト（`ファイル` › テストの名前）を並べる。テストのすぐ上には `// ID: 要件の名前` のコメントがあり、`grep -rn FR-POST-01 src e2e scripts` で ID からテストを引ける。`#NN で確かめる` は、まだ開いている PBI が受け持つ要件で、その PBI がテストを足して書き直す（[ADR-0053](../adr/0053-requirements-trace-to-tests.md)）。

この表は `node scripts/check-traceability.mjs`（`pnpm docs:check` の中）が確かめる: 行の抜け、無いファイル、無いテストの名前、ID を持たないテスト、e2e でない URL のテスト。

## 要件

| ID | 満たす PBI | テスト |
|---|---|---|
| FR-SHELL-01 | #17 | `e2e/app-shell.spec.ts` › 1280px で 275 / 600 / 350px の 3 カラムが出る |
| FR-SHELL-02 | #17 | `e2e/app-shell.spec.ts` › 1024〜1279px では、左ナビがアイコンだけ（88px）で、右サイドバーが出る |
| FR-SHELL-03 | #17 | `e2e/app-shell.spec.ts` › 640〜1023px では、右サイドバーが出ず、左ナビはアイコンだけ |
| FR-SHELL-04 | #17 | `e2e/app-shell.spec.ts` › 640px 未満では、左ナビが出ず、下のタブバーと右下の投稿ボタンが出る |
| FR-SHELL-05 | #17 | `e2e/app-shell.spec.ts` › ヘッダーは高さ 53px で半透明、スクロールしてもヘッダー・左ナビ・右サイドバーが上に残る |
| FR-SHELL-06 | #17 | `e2e/app-shell.spec.ts` › data-theme で背景の色が変わる（light / dim / dark） |
| FR-SHELL-07 | #17・#29 | `e2e/keyboard-settings.spec.ts` › 選んだアクセントの色が、投稿のボタンと本文のリンクの色になる（#30） |
| FR-SHELL-08 | #17 | `src/widgets/app-shell/ui/left-nav.test.tsx` › 今いる画面の項目は aria-current で、太字と塗りつぶしのアイコンになる |
| FR-SHELL-09 | #17 | `e2e/app-shell.spec.ts` › 表示の名前は x-modoki で、どの幅でもフッターに X Corp. とは関係が無いと出る |
| FR-AUTH-01 | #18 | `e2e/auth.spec.ts` › 登録すると /home へ進む |
| FR-AUTH-02 | #18 | `src/features/account-access/model/schema.test.ts` › ユーザー名 %s は、英数字とアンダースコアの 4〜15 文字でないので拒む |
| FR-AUTH-03 | #18 | `src/features/account-access/api/auth-flows.test.ts` › 大文字と小文字だけ違うユーザー名は、使われているとして拒む（T-09） |
| FR-AUTH-04 | #18 | `e2e/auth.spec.ts` › 間違えたときは、どちらが違うかを言わない 1 つの文言を出す |
| FR-AUTH-05 | #18 | `e2e/auth.spec.ts` › ログインが要る画面を開くとログインへ送られ、入ったあと元の画面へ戻る |
| FR-AUTH-06 | #18 | `e2e/auth.spec.ts` › / は、入っていないときは入口を出し、入っているときは /home へ送る |
| FR-AUTH-07 | #18 | `e2e/auth.spec.ts` › ログアウトすると / へ戻り、ユーザー名でもメールアドレスでも入り直せる |
| FR-AUTH-08 | #18 | `src/features/account-access/api/auth-flows.test.ts` › NFR-SEC-05: ログインも同じ IP から 1 分に 11 回目は RATE_LIMITED |
| FR-POST-01 | #19 | `e2e/home-timeline.spec.ts` › 投稿すると、タイムラインの先頭に出る |
| FR-POST-02 | #19 | `src/shared/lib/text-parse/measure-post.test.ts` › 日本語は 2 なので、実質 140 文字 |
| FR-POST-03 | #19 | `src/shared/lib/text-parse/measure-post.test.ts` › 空や空白だけの本文 %j は投稿できない |
| FR-POST-04 | #19 | `src/features/post-compose/ui/compose-box.test.tsx` › 残り 20 で輪が黄色になって数字が出て、0 未満で赤と負の数になり、押せない |
| FR-POST-05 | #25 | `e2e/media.spec.ts` › 画像を付けて投稿すると、カードに画像が出る |
| FR-POST-06 | #25 | `e2e/media.spec.ts` › 画像を選ぶ欄は 4 つの形式だけを受け付け、画像でないファイルと 5MB を超える GIF は送れない（#30） |
| FR-POST-07 | #25 | `src/features/post-compose/api/create-post.test.ts` › 置かれた画像を確かめてから ready にし、代替テキストと順に結びつける。本文が空でもよい |
| FR-POST-08 | #20 | `e2e/post-detail.spec.ts` › 自分の投稿は、確認のダイアログのあとで削除でき、一覧から消える |
| FR-POST-09 | #20 | `src/widgets/post-thread/ui/post-thread.test.tsx` › 親（線つき）・削除された親・本体・返信の入力欄・返信の一覧の順で出す |
| FR-POST-10 | #28 | `e2e/composer-modal.spec.ts` › 投稿ボタンで /compose/post がモーダルで開く。フォーカスは中に閉じ、閉じると元のボタンへ戻る |
| FR-POST-11 | #28 | `e2e/composer-modal.spec.ts` › 中身があるときに閉じると「破棄 / 保存」を聞き、保存した下書きは次に開いたときに戻る |
| FR-POST-12 | #28 | `e2e/composer-modal.spec.ts` › 送ったあと、下の中央に「ポストを送信しました」と「表示」のリンクが出て、その投稿へ進める |
| FR-POST-13 | #19 | `src/features/post-compose/api/create-post.test.ts` › NFR-SEC-05: 同じ人の 11 回目は 1 分の中で RATE_LIMITED |
| FR-POST-14 | #19 | `src/features/post-compose/api/create-post.test.ts` › ハッシュタグ（小文字にそろえて重ねない）とメンション（実在する人だけ）を、同じ投稿に結ぶ |
| FR-CONV-01 | #20 | `e2e/post-detail.spec.ts` › カードを押すと詳細が開き、返信すると返信の一覧に出て、返信先が出る |
| FR-CONV-02 | #20 | `src/entities/post/ui/post-card-nav.test.tsx` › 返信には「返信先: @user」を出し、そのユーザーへのリンクにする |
| FR-CONV-03 | #20 | `e2e/post-detail.spec.ts` › カードを押すと詳細が開き、返信すると返信の一覧に出て、返信先が出る |
| FR-CONV-04 | #20 | `src/entities/post/api/get-timeline.test.ts` › フォロー中: 自分とフォローしている人の、返信でない・削除されていない投稿を、新しい順に |
| FR-CONV-05 | #22 | `src/features/post-repost/api/set-repost.test.ts` › リポストは本文の空な posts の 1 行で、元の数を 1 増やす。2 回しても 1 行。取り消すと行が消え 1 減る |
| FR-CONV-06 | #22 | `src/entities/post/api/get-timeline.test.ts` › フォローしている人のリポストは「フォロー中」に元の投稿として出て、知らない人のリポストは出ない（#30） |
| FR-CONV-07 | #22 | `src/features/post-repost/api/set-repost.test.ts` › リポストは本文の空な posts の 1 行で、元の数を 1 増やす。2 回しても 1 行。取り消すと行が消え 1 減る |
| FR-CONV-08 | #22 | `e2e/repost-quote.spec.ts` › 引用すると、入れ子のカードの付いた入力欄が開き、投稿すると引用が出る |
| FR-CONV-09 | #22 | `src/entities/post/ui/quoted-card.test.tsx` › 元も引用なら「ポストを表示」のリンク。削除されていれば印だけ |
| FR-REACT-01 | #21 | `e2e/reactions.spec.ts` › いいねを押すと、すぐに数が 1 増える。もう一度押すと戻る |
| FR-REACT-02 | #21 | `e2e/reactions.spec.ts` › いいねが失敗したら元に戻り、トーストが出る |
| FR-REACT-03 | #21 | `src/features/post-like/api/set-like.test.ts` › 同時に 2 回いいねしても、数は 1 しか増えない |
| FR-REACT-04 | #21 | `src/entities/post/lib/update-post-in-caches.test.ts` › 全ての一覧（ホームの 2 つのタブ・返信・ブックマーク）の、その ID の投稿だけを書き換える |
| FR-REACT-05 | #21 | `e2e/reactions.spec.ts` › ブックマークすると /i/bookmarks に出て、全て削除で消える |
| FR-REACT-06 | #21 | `src/features/post-view-count/api/count-view.test.ts` › 表示の回数を 1 足す。削除された投稿は足さない（ログインは要らない） |
| FR-REACT-07 | #21 | `e2e/reactions.spec.ts` › prefers-reduced-motion のとき、ハートは動かない |
| FR-TL-01 | #19 | `src/entities/post/api/get-timeline.test.ts` › フォロー中: 自分とフォローしている人の、返信でない・削除されていない投稿を、新しい順に |
| FR-TL-02 | #19 | `src/entities/post/api/get-timeline.test.ts` › おすすめ: 全員の返信でない投稿 |
| FR-TL-03 | #19 | `e2e/home-timeline.spec.ts` › タブを切り替えると、選んだタブに下線が出る |
| FR-TL-04 | #19 | `e2e/home-timeline.spec.ts` › 「フォロー中」は 20 件ずつ読み、下まで行くと続きを読み、最後で止まる。画面の外のカードは DOM から外れる |
| FR-TL-05 | #19 | `src/entities/post/api/get-timeline.test.ts` › 削除した投稿は、フォロー中にもおすすめにも出ない（#30） |
| FR-TL-06 | #28 | `e2e/timeline-new-posts.spec.ts` › ホームを開いたまま、ほかの人の新しい投稿は 30 秒以内に「N 件のポストを表示」で知らされ、押すまで一覧は動かない |
| FR-TL-07 | #28 | `e2e/timeline-restore.spec.ts` › 一覧から詳細へ進んで戻ると、スクロールの位置と読み込んだ続きが元のまま |
| FR-TL-08 | #28 | `e2e/timeline-new-posts.spec.ts` › 一覧を引っ張ると新しい投稿を読み込む |
| FR-TL-09 | #28 | `src/entities/post/ui/post-card.test.tsx` › 9 行以上は最初の 8 行だけを出し、詳細への「さらに表示」を出す。8 行までは出さない |
| FR-PROF-01 | #23 | `e2e/profile.spec.ts` › /{username} に名前と自己紹介が出る。ログイン無しでも見られ、無いユーザー名は 404 |
| FR-PROF-02 | #23 | `e2e/profile.spec.ts` › /{username} に名前と自己紹介が出る。ログイン無しでも見られ、無いユーザー名は 404 |
| FR-PROF-03 | #23・#25 | `src/entities/post/api/get-user-posts.test.ts` › 返信: 返信もリポストも含めて全部。メディア: 画像のある投稿だけ |
| FR-PROF-04 | #23 | `src/features/profile-edit/model/schema.test.ts` › 名前は 1〜50 文字、自己紹介 160、場所 30、リンクは 100 文字までの http か https |
| FR-PROF-05 | #23 | `e2e/profile.spec.ts` › プロフィールを編集はモーダルで開き、保存すると変わる。直接開くとページになる |
| FR-PROF-06 | #25 | `e2e/profile-images.spec.ts` › プロフィールの編集で、アバターとバナーを変えられる |
| FR-PROF-07 | #23 | `src/features/post-pin/api/set-pin.test.ts` › 自分の投稿を固定でき、固定は 1 つだけ（新しく固定すると入れ替わる）。外すと無くなる |
| FR-PROF-08 | #24 | `src/entities/user/api/get-follows.test.ts` › フォロー中とフォロワーを、フォローした順の新しい順に、見ている人がフォローしているか付きで返す |
| FR-PROF-09 | #23 | `src/features/post-compose/api/create-post.test.ts` › NFC にそろえた本文で投稿を作り、作者の投稿の数を 1 増やす |
| FR-FOLLOW-01 | #24 | `src/features/user-follow/api/set-follow.test.ts` › フォローの行と両方の数が同じトランザクションで変わる。2 回でも 1 回。解除で戻る（0 より小さくしない） |
| FR-FOLLOW-02 | #24 | `e2e/follow.spec.ts` › フォローすると、相手の投稿が「フォロー中」に出る |
| FR-FOLLOW-03 | #24 | `src/features/user-follow/api/set-follow.test.ts` › 自分は FORBIDDEN、無い人は NOT_FOUND、ログイン無しは UNAUTHORIZED、1 分に 31 回目は RATE_LIMITED |
| FR-FOLLOW-04 | #24 | `src/features/user-follow/api/set-follow.test.ts` › フォローすると相手の返信でない投稿が「フォロー中」に出て、解除すると出なくなる |
| FR-FOLLOW-05 | #24 | `src/features/user-follow/api/set-follow.test.ts` › 自分は FORBIDDEN、無い人は NOT_FOUND、ログイン無しは UNAUTHORIZED、1 分に 31 回目は RATE_LIMITED |
| FR-NOTIF-01 | #26 | `src/features/post-like/api/set-like.test.ts` › いいねがコミットで失敗すると、通知も残らない（同じトランザクション、#30） |
| FR-NOTIF-02 | #26 | `src/entities/notification/api/notify.test.ts` › 相手への通知の行を作る。同じ人・種類・投稿は繰り返しても 1 行 |
| FR-NOTIF-03 | #26 | `src/widgets/notification-list/ui/notification-list.test.tsx` › %s の行は %s のアイコンを %s で出す（#30） |
| FR-NOTIF-04 | #26 | `src/entities/notification/api/get-notifications.test.ts` › 20 件ずつ、カーソルで続きを返す。「メンション」はメンションと返信だけ |
| FR-NOTIF-05 | #26 | `e2e/notifications.spec.ts` › 未読の数は 30 秒ごとに確かめる（時計を進める） |
| FR-NOTIF-06 | #26 | `e2e/notifications.spec.ts` › 2 人のいいねは 1 行にまとまり、通知を開くと既読になってバッジが消える |
| FR-NOTIF-07 | #26 | `src/entities/notification/api/get-notifications.test.ts` › 自分宛てだけを新しい順に、相手と投稿と既読かどうかを付けて返す |
| FR-SEARCH-01 | #27 | `src/entities/post/api/search-posts.test.ts` › 話題は本文に含む投稿をいいねの多い順、最新は新しい順。消した投稿は出ない |
| FR-SEARCH-02 | #27 | `src/entities/post/api/search-posts.test.ts` › 話題は本文に含む投稿をいいねの多い順、最新は新しい順。消した投稿は出ない |
| FR-SEARCH-03 | #27 | `src/entities/post/api/search-posts.test.ts` › # で始まる語は、ハッシュタグの完全一致で引く（大文字と小文字は区別しない） |
| FR-SEARCH-04 | #27 | `src/entities/user/api/search-users.test.ts` › 名前かユーザー名に含む人を、フォロワーの多い順に。大文字と小文字は区別しない。フォローしているかも付く |
| FR-SEARCH-05 | #27 | `src/entities/post/api/search-posts.test.ts` › 英語は大文字と小文字を区別しない。% と _ は文字として扱う |
| FR-SEARCH-06 | #27 | `src/entities/hashtag/api/get-trends.test.ts` › 直近 24 時間のハッシュタグを、投稿の数の多い順に 10 件、数と一緒に返す。古い投稿と消した投稿は数えない |
| FR-SEARCH-07 | #27 | `src/entities/user/api/get-suggestions.test.ts` › 自分と、フォローしている人を除いて、フォロワーの多い順に 3 人 |
| FR-SEARCH-08 | #27 | `src/entities/post/api/search-posts.test.ts` › 本文の検索の条件は、posts_text_trgm_idx を使える（EXPLAIN、本物の条件で） |
| FR-VIEW-01 | #20 | `e2e/post-detail.spec.ts` › カードを押すと詳細が開き、返信すると返信の一覧に出て、返信先が出る |
| FR-VIEW-02 | #20 | `e2e/post-detail.spec.ts` › URL のユーザー名が作者と違えば正しい URL へ、無い ID と数字でない ID は 404 |
| FR-VIEW-03 | #25 | `e2e/photo-viewer.spec.ts` › 画像を押すとビューアが重なり、左右のキーで前後へ、Esc で前の画面へスクロールの位置のまま戻る |
| FR-VIEW-04 | #25 | `e2e/photo-viewer.spec.ts` › 画像を押すとビューアが重なり、左右のキーで前後へ、Esc で前の画面へスクロールの位置のまま戻る |
| FR-VIEW-05 | #25 | `src/entities/post/ui/post-media.test.tsx` › 2 枚は左右、3 枚は左に大 1 と右に小 2、4 枚は 2×2。すき間は 2px |
| FR-VIEW-06 | #19 | `src/entities/post/ui/post-card.test.tsx` › T-05・T-06: <script> は文字のまま出し、javascript: はリンクにしない |
| FR-VIEW-07 | #19 | `src/shared/lib/format/format.test.ts` › %d ミリ秒前は %s |
| FR-VIEW-08 | #19 | `src/shared/lib/format/format.test.ts` › %d は %s |
| FR-VIEW-09 | #19 | `src/entities/post/ui/post-card.test.tsx` › アバター・名前・@ユーザー名・時刻・本文・操作の列の順で出す |
| FR-OPS-01 | #29 | `e2e/keyboard-settings.spec.ts` › n で入力欄が開く。入力欄の中では n は文字になる |
| FR-OPS-02 | #29 | `e2e/keyboard-settings.spec.ts` › j / k で次 / 前の投稿を選び、フォーカスの輪が出て、画面の中に入る |
| FR-OPS-03 | #29 | `e2e/keyboard-settings.spec.ts` › l で選んだ投稿にいいね、t でリポストのメニュー、r で返信の欄 |
| FR-OPS-04 | #29 | `e2e/keyboard-settings.spec.ts` › g のあと h / n / p で、ホーム / 通知 / プロフィールへ |
| FR-OPS-05 | #29 | `e2e/keyboard-settings.spec.ts` › ? でキーの一覧が出て、Esc で閉じる |
| FR-OPS-06 | #23 | `e2e/profile.spec.ts` › アバターに約 0.5 秒ホバーすると、プロフィールの小さなカードが出る |
| FR-OPS-07 | #21・#28 | `src/_app/entrypoint/query-provider.test.tsx` › トーストは 4 秒のあいだ出ていて、6 秒たつと消える（#30） |
| FR-OPS-08 | #28 | `e2e/composer-modal.spec.ts` › 投稿ボタンで /compose/post がモーダルで開く。フォーカスは中に閉じ、閉じると元のボタンへ戻る |
| FR-SET-01 | #29 | `e2e/keyboard-settings.spec.ts` › /settings/display でテーマと色を選ぶとすぐ変わり、次に開いたときも最初の描画から同じ |
| FR-SET-02 | #29 | `src/features/display-settings/api/actions.test.ts` › 自分のテーマとアクセントの色を users に残し、cookie にも書く。ほかの人は変えない |
| FR-SET-03 | #29 | `e2e/keyboard-settings.spec.ts` › /settings は 2 ペイン。/settings/account にユーザー名・メールアドレス・登録した日が出る |
| FR-SET-04 | #29 | `e2e/keyboard-settings.spec.ts` › 一覧と中身は 1 ペインずつ |
| NFR-A11Y-01 | #31 | `e2e/a11y.spec.ts` › ${theme}: ルーティングの全部の画面に、WCAG 2.2 の A と AA の違反が無い（#31） |
| NFR-A11Y-02 | #31 | `src/_app/styles/tokens.test.ts` › %s・%s: 文字に使う色は、どれも背景とも、ホバーした行の背景とも 4.5:1 以上 |
| NFR-A11Y-03 | #31 | `e2e/keyboard-only.spec.ts` › キーボードだけで、登録・投稿・いいね・返信・フォロー・検索・設定の変更ができる（#31） |
| NFR-A11Y-04 | #28・#31 | `e2e/modals.spec.ts` › 全部のモーダルが、フォーカスを中に閉じ、Esc で閉じ、開いた要素へフォーカスを戻す（#31） |
| NFR-A11Y-05 | #17 | `e2e/app-shell.spec.ts` › フォーカスの輪は、キーボードで動かしたときだけ 2px のアクセント色で出る |
| NFR-A11Y-06 | #17・#31 | `e2e/a11y.spec.ts` › ${theme}: ルーティングの全部の画面に、WCAG 2.2 の A と AA の違反が無い（#31） |
| NFR-A11Y-07 | #21 | `e2e/reduced-motion.spec.ts` › 動きを減らす設定のとき、モーダルの出入りもリンクの色の遷移も動かない |
| NFR-A11Y-08 | #31 | `e2e/a11y.spec.ts` › ${theme}: ルーティングの全部の画面に、WCAG 2.2 の A と AA の違反が無い（#31） |
| NFR-PERF-01 | #32 | `scripts/perf.test.mjs` › 予算は LCP 2.5 秒・CLS 0.1・TBT 200 ミリ秒 |
| NFR-PERF-02 | #32 | `scripts/perf.test.mjs` › 予算は LCP 2.5 秒・CLS 0.1・TBT 200 ミリ秒 |
| NFR-PERF-03 | #32 | `scripts/perf.test.mjs` › 予算は LCP 2.5 秒・CLS 0.1・TBT 200 ミリ秒 |
| NFR-PERF-04 | #32 | `test/home-render-queries.test.ts` › ログインした /home の最初の描画の問い合わせは、レイアウトの分を含めて 6 回以下で、投稿が 20 件でも 40 件でも同じ回数 |
| NFR-PERF-05 | #32 | `e2e/performance.spec.ts` › ログインした /home が最初に送る JavaScript は、gzip で 200KB 以下 |
| NFR-PERF-06 | #32 | `src/entities/post/api/get-timeline.test.ts` › 投稿が 10 万件あり、フォローした 1 人の投稿がまばらでも、1 ページを索引で 50 ミリ秒以下で読む |
| NFR-PERF-07 | #26・#28 | `src/entities/notification/ui/unread-badge.test.tsx` › 30 秒ごとに確かめて数を変える。タブが見えていない間は確かめない |
| NFR-COMPAT-01 | #15 | `scripts/quality-gates.test.ts` › 画面のテストは Chromium・Firefox・WebKit の 3 つで流す |
| NFR-COMPAT-02 | #17・#31 | `e2e/narrow.spec.ts` › 幅 360px で、ルーティングの全部の画面が横にはみ出さない（#31） |
| NFR-COMPAT-03 | #19 | `e2e/server-render.spec.ts` › アプリの JavaScript が届かなくても、最初の描画で投稿の本文が読める（サーバーで描く、#60） |
| NFR-SEC-01 | #18〜#29・#33 | `scripts/check-authz.test.mjs` › このリポジトリでは、全部の入口の認可がテストで確かめられている（scripts/check-authz.mjs） |
| NFR-SEC-02 | #18〜#29 | `src/_app/api-routes/search.test.ts` › 知らない f は 400 で、検索しない（#62） |
| NFR-SEC-03 | #18〜#29・#33 | `src/entities/post/api/get-timeline.test.ts` › DTO の形: ID は文字列、作者・数・見ている人のいいね。メールやハッシュを含まない（NFR-SEC-03） |
| NFR-SEC-04 | #18 | `src/shared/auth/auth.test.ts` › NFR-SEC-04: 本番（https の URL）では、セッションの cookie に Secure が付く。手元の http では付かない（#30） |
| NFR-SEC-05 | #18・#19・#24・#25 | `src/shared/api/rate-limit.test.ts` › 区切りの中で limit 回までは通し、limit + 1 回目で止める |
| NFR-SEC-06 | #19 | `src/shared/lib/text-parse/find-links.test.ts` › http と https の URL だけをリンクにする（スキームの無いもの、javascript: は文字のまま） |
| NFR-SEC-07 | #25 | `src/features/post-compose/api/create-post.test.ts` › 他人の画像・無い画像・置かれていない画像・申告と違う中身（PNG を WebP と偽る、縦横の違い）・使用済みは拒み、何も書かない |
| NFR-SEC-08 | #15・#33 | `src/shared/config/env.test.ts` › NFR-SEC-08: 足りない変数があると、読み込みの時点で例外を投げる |
| NFR-SEC-09 | #33 | `e2e/security-headers.spec.ts` › ページと API の応答に 4 つのヘッダーがあり、CSP は自分のサイトと画像の配信元だけを許す |
| NFR-SEC-10 | #18 | `e2e/auth.spec.ts` › 戻り先に外の URL を入れても、入ったあとは /home へ進む |
| NFR-SEC-11 | #33・#37 | `scripts/quality-gates.test.ts` › CI は、本番の依存の高と重大の脆弱性を監査し、あれば止まる（#33） |
| NFR-I18N-01 | #15 | `e2e/language.spec.ts` › 主な画面は lang="ja" で、英語の UI の言葉を出さない（#30） |
| NFR-I18N-02 | #19 | `src/shared/lib/format/format.test.ts` › %d ミリ秒前は %s |
| NFR-I18N-03 | #19・#34 | #34 で確かめる |
| NFR-MAINT-01 | #15 から全部 | `scripts/quality-gates.test.ts` › カバレッジの閾値は、行・分岐・関数・文の全部で 100%。外せるのは ADR-0021・ADR-0022 の種類だけ |
| NFR-MAINT-02 | #15 から全部 | `scripts/quality-gates.test.ts` › CI は push と PR のたびに、7 つの確認を順に流す |
| NFR-MAINT-03 | #15 から全部 | `scripts/quality-gates.test.ts` › lint は ESLint（警告も 0）と Steiger と src の層と認可のテストの確かめで、ルートから DB を読むと止まる |
| NFR-MAINT-04 | #30 | `scripts/check-traceability.test.mjs` › このリポジトリでは、全部の要件と URL がテストに結びついている（scripts/check-traceability.mjs） |
| NFR-MAINT-05 | 全部 | `scripts/check-docs.test.mjs` › the repository itself passes |
| NFR-MAINT-06 | #15 から全部 | `scripts/quality-gates.test.ts` › サーバーのコードで、ネイティブのモジュール（sharp）とファイルシステムを読むと止まる |

## URL

[ルーティング](../architecture/routing.md)の 1 節の URL ごとの、Playwright のテスト。

| URL | テスト |
|---|---|
| `/` | `e2e/auth.spec.ts` › / は、入っていないときは入口を出し、入っているときは /home へ送る |
| `/i/flow/login` | `e2e/auth.spec.ts` › 間違えたときは、どちらが違うかを言わない 1 つの文言を出す |
| `/i/flow/signup` | `e2e/auth.spec.ts` › 登録すると /home へ進む |
| `/home` | `e2e/home-timeline.spec.ts` › 「フォロー中」は 20 件ずつ読み、下まで行くと続きを読み、最後で止まる。画面の外のカードは DOM から外れる |
| `/explore` | `e2e/search.spec.ts` › 本文の語で検索すると、その投稿が出る |
| `/search?q=&f=` | `e2e/search.spec.ts` › タブで最新・ユーザー・メディアに切り替わる |
| `/notifications` | `e2e/notifications.spec.ts` › 2 人のいいねは 1 行にまとまり、通知を開くと既読になってバッジが消える |
| `/notifications/mentions` | `e2e/notifications.spec.ts` › メンションのタブには、メンションだけが出る |
| `/i/bookmarks` | `e2e/reactions.spec.ts` › ブックマークすると /i/bookmarks に出て、全て削除で消える |
| `/compose/post` | `e2e/composer-modal.spec.ts` › 投稿ボタンで /compose/post がモーダルで開く。フォーカスは中に閉じ、閉じると元のボタンへ戻る |
| `/settings` | `e2e/keyboard-settings.spec.ts` › /settings は 2 ペイン。/settings/account にユーザー名・メールアドレス・登録した日が出る |
| `/settings/account` | `e2e/keyboard-settings.spec.ts` › /settings は 2 ペイン。/settings/account にユーザー名・メールアドレス・登録した日が出る |
| `/settings/display` | `e2e/keyboard-settings.spec.ts` › /settings/display でテーマと色を選ぶとすぐ変わり、次に開いたときも最初の描画から同じ |
| `/settings/profile` | `e2e/profile.spec.ts` › プロフィールを編集はモーダルで開き、保存すると変わる。直接開くとページになる |
| `/{username}` | `e2e/profile.spec.ts` › /{username} に名前と自己紹介が出る。ログイン無しでも見られ、無いユーザー名は 404 |
| `/{username}/following` | `e2e/follow.spec.ts` › フォローすると、相手の投稿が「フォロー中」に出る |
| `/{username}/followers` | `e2e/follow.spec.ts` › フォローすると、相手の投稿が「フォロー中」に出る |
| `/{username}/status/{id}` | `e2e/post-detail.spec.ts` › カードを押すと詳細が開き、返信すると返信の一覧に出て、返信先が出る |
| `/{username}/status/{id}/photo/{n}` | `e2e/photo-viewer.spec.ts` › 画像を押すとビューアが重なり、左右のキーで前後へ、Esc で前の画面へスクロールの位置のまま戻る |
| `/{username}/with_replies` | `e2e/profile-tabs.spec.ts` › プロフィールの返信・メディア・いいねのタブは、それぞれの URL で開き、そのタブが選ばれる（#30） |
| `/{username}/media` | `e2e/profile-tabs.spec.ts` › プロフィールの返信・メディア・いいねのタブは、それぞれの URL で開き、そのタブが選ばれる（#30） |
| `/{username}/likes` | `e2e/profile-tabs.spec.ts` › プロフィールの返信・メディア・いいねのタブは、それぞれの URL で開き、そのタブが選ばれる（#30） |
