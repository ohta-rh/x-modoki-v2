---
type: Research
title: "X (x.com) Web UI/UX 仕様調査"
description: "X の Web 版のレイアウト・配色・部品・操作・URL の形と、名前やロゴを使うときの制約を、2026-11-18 に公開の情報から調べた結果。"
tags: [ui, ux, x, brand]
status: stable
---

# X (x.com) Web UI/UX 仕様調査
## 調査日: 2026-11-18

凡例: **[V]** = verified (出典明記) / **[A]** = approximate (commonly reported / 筆者の既知情報、一次ソース未確認)。
x.com 本体はログイン壁のため、公開ドキュメントと二次情報のみを使用。help.x.com は自動取得が 403 で拒否されたため、キーボードショートカット等は二次情報ベース。

---

## 1. グローバルレイアウト

| 項目 | 値 | 確度 |
|---|---|---|
| 構成 | 左ナビ / メイン / 右サイドバーの3カラム (`header` / `main` / `aside` 相当) | [A] |
| 左ナビ幅 (展開) | 275px | [V] 第三者プロジェクト x-twitter-column-resizer が 275/600/350 と記載 (非公式) |
| 左ナビ幅 (アイコンのみ) | 88px | [A] |
| メイン列 | 幅 600px、左右に 1px ボーダー | [V] 同上 + ishadeed 記事でも 600px のラッパー |
| 右サイドバー | `width: 350px; position: sticky` | [V] ishadeed.com の CSS 解析 |
| サイドバー sticky | 内容が長い場合、下端到達まで流れ、その後固定 (top/bottom に負値オフセットを動的設定) | [V] 同記事 (例 `bottom: -470.5px`、実装は JS で算出) |
| 全体最大幅 | 約 1265px (275+600+350 + 余白)。中央寄せ | [A] |
| 右サイドバー消失 | 約 1000px 前後 (`~1005px` と報告) 以下で非表示 | [A] 具体値は検索で確認できず |
| 左ナビ→アイコン化 | 約 1265px 未満で 88px へ縮小 | [A] |
| モバイル | 約 500px 以下で左ナビ消失、下部タブバー + 右下フローティング投稿ボタン | [A] |

注: ブレークポイント (1265 / 1005 / 988 / 700 等) は検索で一次確認できなかった。**実装時は Tailwind で `xl:`(1280) `lg:`(1024) `sm:`(640) 相当に丸めて問題ない** (見た目の挙動が同じなら十分)。厳密値が必要なら DevTools で `@media` を実測すること。

メイン列 sticky ヘッダー: 高さ約 53px、半透明背景 + `backdrop-filter: blur(12px)` [A]。

## 2. ナビゲーション項目

左ナビ (ログイン時、2026年・Web) 概ねの順序 [A、二次情報: 拡張機能の説明や記事から]:
Home / Explore (Search) / Notifications / Chat (旧 Messages) / Grok / Bookmarks / Communities / Premium / Verified Orgs / Profile / More、続けて Post ボタン、最下部にアカウントスイッチャー (アバター+名前+handle+「…」)。

- Bookmarks は Web では 2026年9月時点も左ナビ上に "Bookmarks" 表示 [V: contextbolt 記事]。iOS は "History" タブ導入の動き。
- モバイルのナビカスタマイズ機能は 2026年6月に Premium から削除されたとの報道 [V: roboin.io] (Web サイドバーとは別件)。
- モバイル下部タブ [A]: Home / Search(Explore) / Grok / Communities / Notifications / Messages。右下に丸い Post FAB。ヘッダーはアバター(ドロワー開閉) + ロゴ。
- **クローンで省略/置換**: Grok, Premium, Verified Orgs, Communities (必要なら "Groups" 等に改名), Chat の暗号化機能。Bookmarks, Notifications, Messages, Profile, More は実装推奨。

## 3. URL / ルート構造

| ルート | 内容 | 備考 |
|---|---|---|
| `/home` | タイムライン (For you / Following) | [A] |
| `/explore` | トレンド・おすすめ | [A] |
| `/search?q=&src=&f=` | `f=live`(Latest) `f=user`(People) `f=media` `f=list` | [A] Top は f 省略 |
| `/notifications` , `/notifications/mentions` | 通知 | [A] |
| `/messages` , `/messages/{id}` | 2ペイン DM | [A] |
| `/i/bookmarks` | ブックマーク | [A] |
| `/{username}` , `/with_replies` , `/media` , `/likes` , `/highlights` , `/articles` | プロフィール各タブ | [A] |
| `/{username}/status/{id}` | 投稿詳細 | [A] |
| `/{username}/status/{id}/photo/{n}` | 画像ビューア | タイムライン上のモーダル。直接ロードでは投稿詳細ページ背景 + ビューア [A] |
| `/compose/post` | 投稿モーダル | モーダルルート。直接ロードでは `/home` 背景に開く [A] |
| `/{username}/followers` , `/following` | フォロワー一覧 | [A] |
| `/settings/*` | 設定 (2ペイン) | [A] |
| `/i/flow/login` , `/i/flow/signup` | ログイン/登録フロー (モーダル) | [A] |

モーダル挙動: 一覧からのクリックで Intercepting Routes (Next.js の `@modal` + `(.)` 記法) が最適。直接ロード/リロードでは同じ URL がフルページとして描画される。compose/photo/login flow/edit profile (`/settings/profile`) が該当。

## 4. デザイントークン

テーマ (3種) [A、hex は第三者の取得値、公式資料未確認]。

| トークン | Default (Light) | Dim | Lights out |
|---|---|---|---|
| 背景 | #FFFFFF | #15202B [V: 複数の第三者パレット] | #000000 [V: 2019年 Twitter iOS 発表 / MacRumors] |
| 枠線 | #EFF3F4 | #38444D | #2F3336 |
| 主テキスト | #0F1419 | #F7F9F9 | #E7E9EA |
| 副テキスト | #536471 | #8B98A5 | #71767B |
| ホバー背景 | rgba(15,20,25,.1) | rgba(255,255,255,.03) | rgba(231,233,234,.1) |

- Dim テーマが 2026年に Web/iOS から削除されたという記述があるが一次確認不可 [V: 出典に記載あるが未検証]。実装は Light/Dark(Lights out) 2種で十分。
- アクセント: Blue #1D9BF0 [V: 第三者パレット、広く一致] / Yellow #FFD400 / Pink #F91880 / Purple #7856FF / Orange #FF7A00 / Green #00BA7C [A]。
- アクション色 [A]: like #F91880, repost #00BA7C, reply/share/bookmark/views は #1D9BF0 (ホバー時)、ホバー背景は各色の 10% alpha の円。
- フォント [A]: Chirp (独自、使用不可) → `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`。クローンは system-ui + `Noto Sans JP` 等。
- サイズ [A]: 投稿本文 15px/20px(weight 400)、名前 15px(700)、handle/時刻 15px(400, 副テキスト色)、ヘッダー見出し 20px(800)、ボタン 15px(700)。
- 角丸 [A]: ボタンはピル(9999px)、メディア 16px、カード 16px、アバター円形。アバター: タイムライン 40px、プロフィール 約134〜150px (ishadeed: 25% ≒ 150px、編集モーダルは max-width 8rem=112px [V])。プロフィール avatar の上方向オーバーラップ `margin-top:-18%` [V: ishadeed]。
- アイコン: 24px (一部 18.75px)、アウトライン→アクティブ時に塗りつぶし [A]。Lucide / Phosphor 等で代替。

## 5. 投稿カード構造

- 構成 [A]: 左に 40px アバター、右列に「名前 + 認証バッジ + @handle · 相対時刻 ... (オーバーフローメニュー)」、本文、メディア、アクションバー。
- アクションバー順 [A]: Reply / Repost / Like / Views / Bookmark + Share。
- 文字数カウント [V: docs.x.com counting-characters]: 上限 280 重み付き文字。ラテン/一般記号 1、絵文字 2、CJK 2、その他 Unicode は既定 2、URL は長さに関わらず 23、返信先頭の自動 @mention は非カウント、添付メディア 0、NFC 正規化後に集計。公式推奨ライブラリは `twitter-text` (`parseTweet`)。日本語は実質 140 文字。Premium は上限が大幅拡張 (25,000 という報告と 10,000 という報告があり不一致 → 未確定)。
- 相対時刻 [A]: 60 秒未満 `Ns`、60 分未満 `Nm`、24 時間未満 `Nh`、同年 `Mon D` (日本語は `M月D日`)、前年以前 `Mon D, YYYY`。詳細ページは絶対時刻 + `· Views`。
- 件数表示 [A]: 1,000 以上 `1.2K`、100万以上 `3.4M`。日本語ロケールは `1.2万` / `3.4億`。
- メディアグリッド [A]: 全体 16px 角丸、2px 程度のギャップ。1枚: 元比率 (最大高さ制限あり、約 16:9〜4:5 範囲)、2枚: 横 2 分割 (各 約 4:5)、3枚: 左 1 大 + 右 2 小、4枚: 2×2。全体の枠比は 16:9 で最大。
- 引用ポスト: 1px ボーダー + 16px 角丸の入れ子カード [A]。リンクカード: 画像 (約 1.91:1) + ドメイン + タイトル [A]。
- 「Show more」: 長文 (約 500 文字超または 280 超の長文投稿) をタイムラインで切り詰め [A]。
- いいねアニメーション [A]: ハートが拡大して色が #F91880 に変わり、周囲に粒子のバースト (スプライト/Lottie)。クローンは CSS keyframes + scale で近似。
- 公式表示要件 [V: docs.x.com display-requirements]: 他社が X の投稿を表示する場合は投稿者アイコン・名前・@handle・タイムスタンプ(permalink)・X ロゴを表示、投稿の改変・モック禁止。実在しない投稿の mockup は禁止 → **クローンは自作ダミーデータで、本物の X 投稿を模倣表示しない**こと。

## 6. タイムライン挙動 [A]

- 上部 sticky ヘッダーに "For you" / "Following" タブ (選択中は 4px のアクセント色下線、blur 背景)。
- 無限スクロール + 仮想化 (画面外のセルを撤去)。スクロール位置は戻る操作で復元。
- 新着: 上部に「Show N posts」ピル (アクセント色 + 上矢印)。
- モバイル: pull-to-refresh。
- スレッド: アバター下に縦線 (2px、枠線色) で連結。返信表示は "Replying to @user" (アクセント色)。
- 投稿詳細: 上に親/本体 (本文 17px に拡大)、直下にインライン返信コンポーザー、その下に返信列。

## 7. コンポーザー [A]

- Home 上部にインライン、サイドナビ Post ボタンでモーダル。
- テキストエリア自動伸長。残量リング: 残り約 20 文字で表示、残り 20 以下で黄色、0 以下で赤 + 数値表示、超過時 Post ボタン無効。
- 添付: 画像/動画最大 4 枚、alt テキスト、GIF、絵文字、投票、スケジュール、位置情報。
- 返信オーディエンス選択 ("Everyone can reply")。スレッドは "+" ボタンで連続投稿追加。
- 閉じる時に内容があれば「Save post? / Discard / Save」確認 (ドラフト保存)。
- 送信後トースト: "Your post was sent. View"。

## 8. プロフィール [A]

- バナー 3:1 (1500×500 推奨)、アバター重なり (上記 -18%)、名前、handle、bio、場所/リンク/登録月、following/followers 数。
- ボタン: Following ホバーで **"Unfollow"** + 赤 (#F4212E 系) の枠/文字。
- タブ: Posts / Replies / Highlights / Articles / Media / Likes。ピン留め投稿は上部に "Pinned" ラベル。
- Edit profile はモーダル (アバター/バナー/名前/bio/場所/URL/誕生日)。

## 9. その他の画面 [A]

- Explore: 上部検索 + タブ (For you / Trending / News / Sports / Entertainment)。右サイドバーに "What's happening" 、"Who to follow"、フッターリンク。
- 検索結果タブ: Top / Latest / People / Media / Lists。
- 通知: All / Verified / Mentions。種別アイコン (like=ピンクのハート、repost=緑、follow=青の人型) + アバター集約。
- Bookmarks: 単純なタイムライン + 全削除メニュー。
- Messages: 2 ペイン (会話一覧約 400px / スレッド)。
- 設定: 2 ペイン (左メニュー約 600px 相当 / 右詳細)、モバイルでは 1 ペイン遷移。
- 未ログイン: ランディング (左ロゴ + 右 "Happening now / Join today")、ログイン/登録はモーダルフロー。

## 10. マイクロインタラクション & アクセシビリティ

- キーボードショートカット: 公式ページ (help.x.com) は 403 で未取得。二次情報では `n`=新規投稿、`l`=いいね、`g`+`l` = Likes、`m`=DM [V: pie-menu.com, martech.zone]。`j`/`k`(移動)、`r`(返信)、`t`(リポスト)、`g`+`h`(Home)、`?`(ヘルプ) は広く知られているが今回一次確認できず [A]。
- ホバーカード (アバター/名前上で約 0.5 秒後)、ツールチップ、トースト (下部中央、アクセント色背景)。
- ローディング: アクセント色の円形スピナー (スケルトンは主に画像/プロフィール)。
- フォーカスリング: キーボード操作時のみ `:focus-visible` で 2px アクセント系アウトライン。`prefers-reduced-motion` を尊重。
- i18n/RTL: `dir` 切替で左右反転 (公式表示要件にも RTL でアバター位置反転と明記 [V])。日本語では相対時刻・件数が `1.2万` 表記。

## 11. 法務・ブランド境界

- 公式ドキュメントは「X Brand Assets and Guidelines に従うこと」を要求し、X ロゴの使用は公式ブランドツールキット経由 [V: docs.x.com]。旧ガイドラインには「違反使用は許諾を自動終了」との条項 [V: 検索結果が引く PDF]。
- 禁止事項 [V: docs.x.com display-requirements]: X との誤った関連づけの示唆、X 投稿の改変、実在しない投稿の mockup、他の SNS ボタン混在、X コンテンツでの推奨/後援の示唆。
- クローンが避けること: 名称 "X"/"Twitter"/"Tweet"/"Post as X" の使用、X ロゴ/Chirp フォント/アイコン/画像の複製、ハートの「いいね」粒子アニメーション素材の流用、X のスクリーンショットをそのまま掲載、実在アカウントを装うダミーデータ、「X 公式」と誤認させる文言。レイアウト・インタラクション規約(3カラム、タブ等)自体は一般的 UI パターンだが、配色/アイコン/文言の組合せで trade dress と混同される恐れ → 独自のロゴ・名称・差別化した配色 (例: アクセント色を #1D9BF0 以外にする) を推奨。法的助言ではない。

---

## N. 推奨・結論

- **完全に再現**: 3 カラム構造 (275/600/350)、sticky ヘッダー + blur、タブ、スレッド線、ホバー挙動 (Following→Unfollow)、文字数重み付けルール (twitter-text 準拠、URL=23、CJK/絵文字=2)、モーダルルート (Next.js intercepting routes)。
- **近似でよい**: ブレークポイント (Tailwind 標準に丸める)、配色 hex、アイコン (Lucide)、アニメーション、メディアグリッド比率。
- **省略/置換**: Grok, Premium, Verified Orgs, Communities, Chat 暗号化、広告、X ロゴ・名称・Chirp。
- 配色は Light + Dark (Lights out 相当) の 2 テーマで十分 (Dim は 2026 年に廃止説あり、未確認)。
- 理由: 一次情報の取得が困難な数値は多いが、挙動の再現には厳密な px 値より構造が重要。

## 未検証事項

- 全ブレークポイント値 (1265 / 1005 / 988 / 700 等) — 検索で未確認 [A]。
- 88px の折りたたみナビ幅、53px ヘッダー高、blur 量 — [A]。
- テーマ別 hex の一部 (枠線、副テキスト、ホバー) — 第三者パレット・記憶ベース [A]。Dim #15202B と Lights out #000000 のみ複数ソースで一致。
- 公式キーボードショートカット一覧 (help.x.com は 403)。
- 2026 年時点の左ナビ項目の正確な順序 (Chat/Grok 位置) — 公式資料なし。
- Premium の文字数上限 (10,000 vs 25,000 の矛盾)。
- Dim テーマ削除の真偽。
- 相対時刻・メディア比率・"Show more" 閾値・通知グルーピング等の詳細は既知情報ベースで [A]。
- X ブランドガイドライン本文 (about.x.com) は未取得。

## 参考リンク

- [Counting characters (X Developer Docs)](https://docs.x.com/resources/fundamentals/counting-characters)
- [Display requirements (X Developer Docs)](https://docs.x.com/developer-terms/display-requirements)
- [The Layout Maestro (Ahmad Shadeed)](https://ishadeed.com/article/twitter-css/)
- [x-twitter-column-resizer (275/600/350 記載)](https://awesome.ecosyste.ms/projects/github.com%2Fbluebirdback%2Fx-twitter-column-resizer)
- [X (twitter) optimized & customizable for wide screens (Greasy Fork)](https://greasyfork.org/scripts/497109)
- [Twitter for iOS Gains Darker Dark Mode (MacRumors)](https://www.macrumors.com/2019/03/28/twitter-for-ios-lights-out-mode/)
- [Twitter Dim Theme (Greasy Fork)](https://greasyfork.org/es/scripts/566059-twitter-dim-theme/code)
- [Design tokens (thefrontkit)](https://thefrontkit.com/docs/social-media-dashboard-kit/design-tokens)
- [X may remove undo post and navigation customization (roboin.io)](https://roboin.io/article/en/2026/06/08/x-may-remove-undo-post-and-navigation-customization-features-from-premium.md)
- [X History Tab guide (contextbolt)](https://contextbolt.com/blog/x-history-tab/)
- [Grok Bot in X's Nav Menu (basenor)](https://www.basenor.com/blogs/news/grok-bot-in-xs-nav-menu-5-details-that-matter)
- [X shortcuts (pie-menu)](https://pie-menu.com/shortcuts/x)
- [Twitter keyboard shortcuts (martech.zone)](https://martech.zone/twitter-keyboard-shortcuts)
- [X brand toolkit guidelines PDF (mirror, older)](https://meilu1.jpshuntong.com/url-68747470733a2f2f63646e2e636d732d74776469676974616c6173736574732e636f6d/content/dam/about-twitter/x/brand-toolkit/x-brand-guidelines.pdf)

---

## 最終判断

この調査は「テーマは Light と Dark の 2 つで足りる」「アクセントの色を `#1D9BF0` 以外にする」ことを勧めている。ユーザーの指示は「可能な限り X を模倣する」なので、[ADR-0009](../adr/0009-mimic-x-ui-with-own-brand.md) では 3 つのテーマと `#1D9BF0` の既定のアクセントを残し、色を CSS の変数 1 か所で替えられるようにした。名前・ロゴ・アイコン・フォント・データを自前にする点は、この調査の勧めどおりにした。
