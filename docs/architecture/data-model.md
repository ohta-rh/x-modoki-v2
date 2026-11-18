---
type: Architecture
title: "データモデル"
description: "PostgreSQL の表・列・制約・索引と、タイムラインと数の増減の問い合わせの形を示す。"
tags: [architecture, database, data-model]
status: stable
---

# データモデル

- 決定: [ADR-0006](../adr/0006-postgresql-drizzle.md)、[ADR-0015](../adr/0015-timeline-fan-out-on-read.md)、[ADR-0016](../adr/0016-time-ordered-64bit-post-ids.md)、[ADR-0007](../adr/0007-better-auth-db-sessions.md)、[ADR-0034](../adr/0034-foreign-keys-cascade-from-users-and-detach-thread-links.md)
- 正本は `src/shared/db/schema/` の TypeScript。この文書は表の関係と意図を示す

## 1. 表の関係

```
users ─┬─< sessions / accounts            （Better Auth）
       ├─< posts ─┬─< post_media >── media
       │          ├─< post_hashtags >── hashtags
       │          ├─< mentions >── users
       │          ├── reply_to_id / root_id / quote_of_id / repost_of_id ──▶ posts
       │          ├─< likes >── users
       │          └─< bookmarks >── users
       ├─< follows >── users
       └─< notifications（recipient / actor / post）

verifications（Better Auth）     rate_limits
```

## 2. 表

型の `id64` は、[ADR-0016](../adr/0016-time-ordered-64bit-post-ids.md) の 64 bit の整数（`bigint`）。時刻は全部 `timestamptz`。

### users（Better Auth の `user` に列を足す）

| 列 | 型 | 制約・意味 |
|---|---|---|
| `id` | `text` | 主キー。Better Auth が作る |
| `email` | `text` | 一意 |
| `email_verified` | `boolean` | |
| `name` | `text` | 表示の名前。50 文字まで |
| `username` | `text` | @handle。小文字にしたもので一意。4〜15 文字 |
| `display_username` | `text` | 入力したままの大文字と小文字 |
| `image` | `text` | アバターの画像のキー |
| `banner` | `text` | バナーの画像のキー |
| `bio` | `text` | 160 文字まで |
| `location` | `text` | 30 文字まで |
| `website` | `text` | 100 文字まで |
| `pinned_post_id` | `id64` | 固定した投稿。無ければ null |
| `followers_count` / `following_count` / `posts_count` | `integer` | 既定 0 |
| `theme` | `text` | `light` / `dim` / `dark` |
| `accent` | `text` | アクセントの色の名前 |
| `created_at` / `updated_at` | `timestamptz` | |

`sessions`・`accounts`・`verifications` は Better Auth が決める形のまま使う。パスワードのハッシュは `accounts` にある。

### posts

| 列 | 型 | 制約・意味 |
|---|---|---|
| `id` | `id64` | 主キー |
| `author_id` | `text` | `users.id`。消すときは一緒に消す |
| `text` | `text` | 本文。リポストは空 |
| `reply_to_id` | `id64` | 返信の相手の投稿。無ければ null |
| `root_id` | `id64` | スレッドの最初の投稿。返信でなければ null |
| `quote_of_id` | `id64` | 引用した投稿。無ければ null |
| `repost_of_id` | `id64` | リポストした元の投稿。無ければ null |
| `reply_count` / `repost_count` / `quote_count` / `like_count` / `bookmark_count` / `view_count` | `integer` | 既定 0 |
| `created_at` | `timestamptz` | |
| `deleted_at` | `timestamptz` | 消した時刻。消していなければ null |

- 1 行は、普通の投稿・返信・引用・リポストのどれか 1 つ。`repost_of_id` があるときは `text` が空で、`reply_to_id` と `quote_of_id` が null（CHECK の制約）
- 同じ人が同じ投稿を 2 回リポストできない（`(author_id, repost_of_id)` の一意の部分索引）
- 消すときは `deleted_at` を入れる。返信がぶら下がっているので行は残し、表示では「このポストは削除されました」と出す

### media と post_media

| 表 | 列 | 型 | 制約・意味 |
|---|---|---|---|
| `media` | `id` | `id64` | 主キー |
| | `owner_id` | `text` | 送った人 |
| | `key` | `text` | ストレージのキー。一意 |
| | `mime` | `text` | |
| | `width` / `height` | `integer` | ブラウザが申告し、サーバーが置かれた画像から確かめた値 |
| | `alt` | `text` | 代替テキスト。1,000 文字まで |
| | `status` | `text` | `pending`（送る前）/ `ready`（確かめて、投稿に結びついた） |
| | `created_at` | `timestamptz` | |
| `post_media` | `post_id` | `id64` | |
| | `media_id` | `id64` | 一意（1 つの画像は 1 つの投稿だけに付く） |
| | `position` | `smallint` | 0〜3。`(post_id, position)` が主キー |

### likes・bookmarks・follows

| 表 | 主キー | ほかの列 |
|---|---|---|
| `likes` | `(user_id, post_id)` | `created_at` |
| `bookmarks` | `(user_id, post_id)` | `created_at` |
| `follows` | `(follower_id, followee_id)` | `created_at`。自分をフォローできない（CHECK） |

### hashtags・post_hashtags・mentions

| 表 | 列 | 意味 |
|---|---|---|
| `hashtags` | `id`（`id64`）、`tag`（小文字にしたもの。一意） | |
| `post_hashtags` | `(post_id, hashtag_id)` が主キー、`created_at` | トレンドは、ここを期間で数える |
| `mentions` | `(post_id, user_id)` が主キー | 本文の中の @メンション |

### notifications

| 列 | 型 | 制約・意味 |
|---|---|---|
| `id` | `id64` | 主キー |
| `recipient_id` | `text` | 受け取る人 |
| `actor_id` | `text` | 起こした人 |
| `type` | `text` | `like` / `repost` / `reply` / `quote` / `mention` / `follow` |
| `post_id` | `id64` | 対象の投稿。`follow` は null |
| `read_at` | `timestamptz` | 読んだ時刻。未読は null |
| `created_at` | `timestamptz` | |

- 自分への操作では作らない
- 同じ人が同じ投稿に同じ種類の操作を繰り返しても 1 行だけ（`(recipient_id, actor_id, type, post_id)` が一意）。取り消したら消す
- 画面では、種類と投稿が同じものをまとめて出す

### rate_limits

| 列 | 型 | 意味 |
|---|---|---|
| `key` | `text` | 例: `post:<user_id>` |
| `window_start` | `timestamptz` | 区切りの始まり |
| `count` | `integer` | |

`(key, window_start)` が主キー。`INSERT … ON CONFLICT DO UPDATE SET count = count + 1` で数える。

### 外部キーと、消したときの振る舞い（ADR-0034）

- 人を参照する全ての列は、人を消すと一緒に消える（`ON DELETE CASCADE`）
- 投稿を参照する列のうち、いいね・ブックマーク・画像とハッシュタグの結びつき・メンション・通知・リポストの元（`repost_of_id`）は一緒に消える
- 返信の相手・スレッドの最初・引用の元（`reply_to_id`・`root_id`・`quote_of_id`）は null になる
- `users.pinned_post_id` には外部キーが無い。固定した投稿を消すときは、アプリが null にする
- Better Auth の表の名前は `users`・`sessions`・`accounts`・`verifications`。Drizzle では `user`・`session`・`account`・`verification` という名前で出す（Better Auth がその名前で探す）

## 3. 索引

- 新しい順（`DESC`）の索引は、全て `DESC NULLS FIRST`。`ORDER BY … DESC` の既定と同じにして、並べ替えに使われるようにする（ADR-0034）
- 文書の 3 節の全ての索引の形は、`src/shared/db/schema.test.ts` が `pg_indexes` で確かめる

| 索引 | 使う場面 |
|---|---|
| `posts (author_id, id DESC)` | プロフィール、「フォロー中」 |
| `posts (id DESC) WHERE reply_to_id IS NULL AND deleted_at IS NULL` | 「おすすめ」 |
| `posts (reply_to_id, id)` | 返信の一覧 |
| `posts (root_id, id)` | スレッド |
| `posts USING gin (text gin_trgm_ops)` | 本文の検索 |
| `users (lower(username))` 一意 | プロフィール、ログイン |
| `users USING gin ((name \|\| ' ' \|\| username) gin_trgm_ops)` | ユーザーの検索 |
| `follows (followee_id, follower_id)` | フォロワーの一覧 |
| `likes (post_id)`、`likes (user_id, created_at DESC)` | いいねした人、プロフィールの「いいね」 |
| `bookmarks (user_id, created_at DESC)` | ブックマーク |
| `notifications (recipient_id, id DESC)` | 通知 |
| `notifications (recipient_id) WHERE read_at IS NULL` | 未読の数 |
| `post_hashtags (hashtag_id, post_id DESC)`、`post_hashtags (created_at)` | ハッシュタグの検索、トレンド |
| `media (status, created_at)` | 結びつかなかった画像の掃除 |

## 4. 問い合わせの形

### 「フォロー中」の 1 ページ

```sql
SELECT p.*
FROM posts p
WHERE p.deleted_at IS NULL
  AND p.reply_to_id IS NULL
  AND (p.author_id = $viewer
       OR p.author_id IN (SELECT followee_id FROM follows WHERE follower_id = $viewer))
  AND ($cursor::bigint IS NULL OR p.id < $cursor)
ORDER BY p.id DESC
LIMIT 21;   -- 21 件目があれば、続きがある
```

作者・画像・引用した投稿・リポストした元の投稿と、見ている人がいいね・リポスト・ブックマークしたかは、この 20 件の ID でまとめて引く。投稿ごとに問い合わせない。

### いいね

```sql
BEGIN;
INSERT INTO likes (user_id, post_id) VALUES ($viewer, $post) ON CONFLICT DO NOTHING;
-- 1 行入ったときだけ、下の 2 つを行う
UPDATE posts SET like_count = like_count + 1 WHERE id = $post;
INSERT INTO notifications (id, recipient_id, actor_id, type, post_id)
  VALUES ($id, $author, $viewer, 'like', $post) ON CONFLICT DO NOTHING;
COMMIT;
```

取り消しは逆の順で行い、数は 0 より小さくしない。

### 本文の検索

```sql
SELECT p.* FROM posts p
WHERE p.deleted_at IS NULL
  AND p.text ILIKE '%' || $q || '%'      -- gin_trgm_ops の索引が使われる
  AND ($cursor::bigint IS NULL OR p.id < $cursor)
ORDER BY p.id DESC
LIMIT 21;
```

`#` で始まる語は、`hashtags` と `post_hashtags` で完全一致で引く。
