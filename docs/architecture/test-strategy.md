---
type: Design
title: "テストの設計"
description: "どの層を何の道具で確かめ、何を偽物にしてよいか、テストのファイルとデータの置き場所、認可のテストの型、ブラウザでのテスト、TDD の進め方を定める。"
tags: [testing, design]
status: stable
---

# テストの設計

- 決定: [ADR-0013](../adr/0013-vitest-playwright-testing.md)（道具）、[ADR-0021](../adr/0021-coverage-100-percent.md)（カバレッジ 100%）、[ADR-0024](../adr/0024-definition-of-done-requires-browser-testing.md)（ブラウザ）、[ADR-0026](../adr/0026-implementation-is-always-test-driven.md)（TDD）、[ADR-0031](../adr/0031-database-tests-per-worker-database-and-truncate.md)（データベースのテスト）
- 要件との対応: [機能の要件](../requirements/functional.md) と [機能でない要件](../requirements/non-functional.md) の「確かめ方」の列が、この文書の層の名前（単体・DAL・画面）を使う

## 1. 層ごとの確かめ方

| 確かめるもの | 置き場所の例 | 道具 | 環境 | 偽物にしてよいもの | 偽物にしないもの |
|---|---|---|---|---|---|
| 純粋な関数（文字数・時刻と数の整形・ID・Zod のスキーマ） | `src/shared/lib/**`、各スライスの `model` | Vitest | node | 時刻（`vi.setSystemTime`）、乱数 | — |
| 同期のコンポーネント | 各スライスの `ui` | Vitest と React Testing Library | jsdom（ファイルの先頭に `// @vitest-environment jsdom`） | Server Action（関数を props で渡す）、時刻 | — |
| クライアントのフックと状態（TanStack Query のキャッシュの書き換え） | 各スライスの `model`・`lib` | Vitest | jsdom | `fetch`（`vi.stubGlobal`） | — |
| データアクセス層（`api` セグメント） | `entities/*/api`、`features/*/api`、`_pages/*/api` | Vitest | node と本物の PostgreSQL | 時刻、乱数、ストレージの署名、セッション（`@/shared/auth` の `getSession`） | Drizzle、PostgreSQL、トランザクション |
| Server Action | `features/*/api/actions.ts` | Vitest | node と本物の PostgreSQL | 同上、`next/cache` の `updateTag`・`refresh` | 入力の検証、認可 |
| Route Handler | `src/_app/api-routes/**` | Vitest（`Request` を作って関数を呼ぶ） | node と本物の PostgreSQL | 同上 | 応答の形、状態のコード |
| `proxy.ts` | ルート | Vitest（`NextRequest` を作って呼ぶ） | node | — | — |
| ページ・レイアウト・モーダルのルート（非同期の Server Component） | ルートの `app/` | Playwright | Chromium・Firefox・WebKit、本番のビルド | — | 全部 |
| 画面をまたぐ流れ | `e2e/` | Playwright | 同上 | — | 全部 |

- **データベースを偽物にしない。** データアクセス層のテストは、本物の PostgreSQL に対して動かす（ADR-0013）
- ストレージ（Garage）は、署名の関数を偽物にしてよい。送る・読む流れは Playwright で本物を通す
- 外へのリクエスト（無い予定）は、全部偽物にする

## 2. ファイルの置き場所と名前

| 種類 | 置き場所 | 名前 |
|---|---|---|
| 単体・DAL のテスト | 確かめるファイルの隣 | `<ファイル名>.test.ts` / `.test.tsx` |
| 画面のテスト | `e2e/` | `<ページか流れ>.spec.ts`（例 `e2e/home-timeline.spec.ts`） |
| テストの補助 | リポジトリのルートの `test/`（ADR-0031） | `test/db.ts`・`test/factories.ts`・`test/server-only.ts` |
| Playwright の補助 | `e2e/support/` | `auth.ts`（ログインした状態を作る）など |

- テストの名前は振る舞いで書く。要件の ID があれば先頭に付ける: `it('FR-POST-02: 281 の重みの本文は投稿できない', …)`
- `describe` は確かめる関数か部品の名前

## 3. データベースのテスト（ADR-0031）

- Vitest の全体の準備（`test/global-setup.ts`）が、`xmodoki_test` を作り直し、マイグレーションを流す
- 各ワーカーは、`xmodoki_test` をひな形にして `xmodoki_test_<VITEST_POOL_ID>` を作る
- 各テストの前に、`test/db.ts` の `resetDb()` が全ての表を `TRUNCATE … RESTART IDENTITY CASCADE` で空にする
- データアクセス層が呼ぶ `getDb()` は、`vi.mock('@/shared/db', …)` で、そのワーカーのデータベースを返すものに替える
- データは `test/factories.ts` の関数で作る。シードには頼らない

```ts
// 形の例（実装は #16）
import { makePost, makeUser } from '@test/factories';
import { resetDb, useTestDb } from '@test/db';

useTestDb(); // vi.mock と beforeEach(resetDb) をまとめたもの

it('FR-REACT-03: 同じ人が 2 回いいねしても、数は 1 しか増えない', async () => {
  const author = await makeUser();
  const viewer = await makeUser();
  const post = await makePost({ authorId: author.id });
  signInAs(viewer);
  await Promise.all([likePost(post.id), likePost(post.id)]);
  expect((await getPost(post.id)).counts.likes).toBe(1);
});
```

### 時刻と ID

- 時刻は `vi.useFakeTimers()` と `vi.setSystemTime()` で決める。データベースの時刻（`now()`）に頼る問い合わせは、アプリの側で時刻を渡す形にする
- ID は `newId({ now, random })` のように、引数で時刻と乱数を渡せる形にする。既定は `Date.now()` と `crypto.getRandomValues()`

## 4. 認可のテストの型

データアクセス層の**全ての変更の関数**に、次の 3 つを必ず書く（[機能でない要件](../requirements/non-functional.md) の NFR-SEC-01）。

| ケース | 期待 |
|---|---|
| 本人（自分の投稿・自分のアカウント） | 成功し、データが変わる |
| 他人 | `FORBIDDEN`。データが変わらない |
| ログインしていない | `UNAUTHORIZED`。データが変わらない |

他人のものに触れない関数（いいね・フォローなど、誰でもしてよい操作）は、「他人」の代わりに、削除された投稿・存在しない相手で `NOT_FOUND` を確かめる。

ログインが要る全ての Route Handler に、「ログインしていなければ 401」のテストを書く。

## 5. ブラウザでのテスト（ADR-0024）

### Playwright

- 相手は本番のビルド（`pnpm build && pnpm start`）。Docker Compose の PostgreSQL と Garage を使う
- Chromium・Firefox・WebKit の 3 つで動かす。最初の失敗で止める（`--max-failures=1`）
- 失敗したら、画面の写真と操作の記録（trace）を残す。CI は成果物として上げる
- ログインは、テストの前に 1 回だけ API で登録・ログインし、`storageState` を保存して使う（`e2e/support/auth.ts`）。画面の登録の流れは、登録のテスト（#18）でだけ通す
- データは、テストごとに API（Better Auth の登録と、Server Action を通る画面の操作）で作る。シードに頼らない
- 待つときは、決まった秒数ではなく、画面に出るものを待つ（`expect(locator).toBeVisible()`）
- 受け入れ条件のうち、画面で観測できるものは全部、Playwright のテストにする（完了の定義の 4）
- 全てのページのルートに、Playwright のテストが 1 本以上ある（NFR-MAINT-04）

### 本物の Chrome での実際の操作

`.claude/rules/definition-of-done.md` の「Hands-on test in Chrome」のとおり。毎回見るもの:

| 見るもの | 基準 |
|---|---|
| 変更そのものと、失敗の経路 1 つ | 受け入れ条件どおりに動く |
| 幅 | 1280・768・375px で崩れず、横にスクロールしない（`scripts/chrome-evidence.mjs` で撮り、写真を開いて読む） |
| テーマ | 変更が関わるテーマ（色と線に触れたら 3 つ全部） |
| コンソールと通信 | エラーと警告が 0、失敗した通信が 0 |
| キーボード | 新しい操作に Tab で届き、フォーカスの輪が出る |
| 隣の画面 | 変えていない画面を 1 つ開き、壊れていない |

記録は試験レポート（ADR-0025）の「ブラウザでの確認」に書き、写真を `docs/test-reports/evidence/` に置く。

## 6. TDD の進め方（ADR-0026）

外側から内側へ進む。

1. 受け入れ条件の **Playwright のテスト**を書き、落ちるのを見る（ページが無い・振る舞いが無い）
2. その振る舞いに要る部品ごとに、内側の層で「テストを書く → 期待した理由で落ちるのを見る → 最小の実装 → 整理」を繰り返す
3. 内側が全部緑になってから、Playwright のテストが緑になる

層ごとの「最初に落とすテスト」の例:

| 層 | 最初に書いて落とすテスト | 期待する落ち方 |
|---|---|---|
| 画面 | `e2e/reactions.spec.ts` › いいねを押すと、すぐに数が 1 増える | ボタンが見つからない |
| DAL | `like.test.ts` › 他人の投稿にいいねすると、数が 1 増える | `likePost is not a function` ではなく、関数を空で用意してから `expected 1, received 0` |
| 単体 | `weight.test.ts` › 281 の重みは超過 | `expected true, received false` |
| コンポーネント | `post-card.test.tsx` › 削除された投稿は「このポストは削除されました」 | 文言が見つからない |

「期待した理由」で落ちることが大事なので、関数や部品は**先に空の形だけを作り**、読み込みの失敗ではなく、振る舞いの違いで落ちるのを見る。

### 記録

試験レポートの `## 自動のテスト` の下の `### TDD の記録` に、振る舞いごとに 1 行書く（`.claude/rules/tdd.md`）。「赤」の列には、落ちたときの実際の出力を写す。記録は、その場で書く。あとから思い出して書かない。

## 7. カバレッジ（ADR-0021・ADR-0022）

- 測る対象: `src/**`・`app/**/route.ts`・`proxy.ts`
- 外すもの: ルートの `app/**/{page,layout,default}.tsx`、`src/shared/ui/kit/**`、`src/shared/db/schema/**`、型だけのファイル
- しきい値: 行・分岐・関数・文の 4 つとも 100
- `test/` と `e2e/` は測らない
