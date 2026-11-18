# Definition of Done

The single definition of "done" for every PBI in this repository (ADR-0024, ADR-0025, ADR-0026,
ADR-0027, with ADR-0020, ADR-0021, ADR-0023). An issue is closed only when **every** item below holds. There
is no partial done, and no item is waived because a change "is small" or "has no UI".

## The checklist

1. **Acceptance criteria.** Every criterion in the issue is met and was checked by the method
   the issue states — one by one, not by inference from green tests.
2. **Test-driven.** Every behavior was implemented red → green → refactor: the test was written
   first and seen to fail for the expected reason before any production code
   (`.claude/rules/tdd.md`). The failing runs are recorded in the test report.
3. **Gates.** `pnpm verify` exits 0 locally (docs, typecheck, lint + Steiger, format,
   test with 100% coverage, build, e2e). Nothing skipped, nothing weakened
   (`.claude/rules/quality-gates.md`).
4. **Automated browser test.** Every acceptance criterion that is observable in a browser has
   a Playwright test, and the suite passes in CI on **Chromium, Firefox, and WebKit**.
5. **Hands-on test in Chrome.** You opened the result in real Chrome and exercised the change
   yourself (details below), and saved screenshots of what you saw.
6. **Independent code review.** For any PBI that changes code: a fresh `code-reviewer` subagent
   (opus, read-only, given only the issue number and the diff range) returned `APPROVE`
   before the push. Every finding was verified by you, then fixed test-first or rejected with
   evidence; the outcome is in the test report (`.claude/rules/code-review.md`).
7. **CI.** GitHub Actions is green on the commit that contains the change — watched to the end.
8. **Decisions and documents.** Any architecture / technology / cross-cutting decision has an
   ADR in the same commit; affected documents under `docs/` and rules under `.claude/rules/`
   are updated; `node scripts/check-docs.mjs` passes.
9. **Test report with evidence.** A report for this PBI exists under `docs/test-reports/`,
   with its screenshots under `docs/test-reports/evidence/`, and is pushed with green CI
   (format below).
10. **Closing comment.** The issue is closed with a comment containing the commit SHA, the CI
   run URL, and a link to the test report — after every box in the issue's 完了の定義 section
   is ticked.

Every PBI body carries these ten items, verbatim, as its 完了の定義 checklist
(`.claude/rules/issue-authoring.md`). Changing this list means changing this file, the PBI
template, and every open PBI in the same change.

## Hands-on test in Chrome (item 5) — always, for every PBI

**Look at it. Do not infer it.** A passing script is not a look. The first time this rule was
applied (2026-11-18) Chrome showed issue titles printed twice in a task list that every
mechanical check had passed.

**What to run against.** The production build: `pnpm build && pnpm start`, with
`docker compose up -d` and seeded data. `pnpm dev` alone does not count — Cache Components and
`<Suspense>` behave differently there.

**How.** Real Chrome, through the Claude-in-Chrome tools or the Chrome DevTools MCP tools.
Take screenshots (`save_to_disk`) as you go — they are the evidence for item 9. Only if
neither tool is available: run Playwright headed in Chromium with a scripted walk-through that
saves screenshots and the console log, and say so in the report.

**Widths — verify the viewport actually changed.** Two traps found on 2026-11-18:
`resize_window` can report success while the window stays the same size, and headless Chrome
with `--window-size=375,…` lays the page out at ~500px and crops it. So:

- After any resize, read `window.innerWidth` and confirm it equals the width you asked for.
- For the per-width screenshots use `node scripts/chrome-evidence.mjs --out <evidence dir>
  <name>=<url> …`. It opens each page with an exact viewport (Playwright driving the installed
  Google Chrome; the bundled Chromium in CI), saves
  `<name>-<width>.jpg` for 1280 / 768 / 375, prints the real `innerWidth`, sideways scroll,
  console errors, and failed requests, and exits 1 if any of them is wrong.
  For a page that needs a signed-in user, add `--storage-state <file>` (a Playwright storage state
  saved after signing in to the local app with a test account).
- **Then open the saved images and read them.** A screenshot nobody looked at is not evidence.
- Save a screenshot the moment you find a problem, before fixing it — the "before" is evidence too.

**What to check, every time:**

- The change itself: perform each user-visible behavior the PBI adds or alters, including one
  failure path (invalid input, logged out, not found).
- Three widths: **1280px, 768px, 375px**. Layout holds; nothing overflows, overlaps, or
  scrolls sideways.
- Themes: every theme the change touches (all three for anything with color or borders).
- **Console: zero errors and zero warnings** caused by the app. Network: no failed or
  unexpected requests.
- Keyboard: the new controls are reachable by Tab and show a focus ring.
- One neighbouring screen you did not change, to catch collateral breakage.
- Read what is on the screen as a user would: duplicated text, raw Markdown, truncated
  labels, wrong numbers, placeholder strings.

**When the PBI has no screen of its own:**

| Kind of PBI | Hands-on test in Chrome |
|---|---|
| Server-only change (Route Handler, Server Action, `api` segment, schema) | Exercise it through a screen that uses it. If none exists yet, open or call the URL from Chrome and inspect the response |
| Documentation only | After pushing, open the rendered document on GitHub and confirm tables, links, code blocks, and diagrams render and resolve |
| Issues / EPICs filed or edited | Open each kind of issue on GitHub: body renders, task lists and sub-issues show once, links resolve |
| Tooling / CI / config | Open the app and confirm it still loads with a clean console; open the CI run page and confirm every job is green |
| Investigation in a throwaway app | Run the throwaway app in Chrome; the observations and screenshots go into the research document and the report |

## Test report (item 9) — ADR-0025

- **Path:** `docs/test-reports/issue-NNNN-<kebab-summary>.md` (NNNN = zero-padded issue
  number). Work not tied to a PBI: `docs/test-reports/YYYY-MM-DD-<kebab-summary>.md`.
- **Frontmatter:** `type: TestReport`, `status: stable`, plus the usual `title`,
  `description`, `tags` (`.claude/rules/documentation.md`).
- **Evidence:** `docs/test-reports/evidence/<report-file-name-without-.md>/`. At least one
  Chrome screenshot per width checked. JPEG or WebP, ≤ 300KB each, ≤ 12 per report. Command
  output goes in the report body as a fenced block (last 30 lines at most).
- **Never capture** secrets, real people's data, or a logged-in personal account.
- **Sections, in this order, all required:**

  ```markdown
  # 試験レポート: <PBI のタイトル>

  ## 対象
  - issue: #N　commit: <SHA>　CI: <実行の URL>　日付: YYYY-MM-DD

  ## 環境
  - OS / ブラウザと版 / Node.js / データベース / 動かし方

  ## 判定
  合格 | 不合格 — 受け入れ条件 M 件のうち K 件を満たした

  ## 受け入れ条件ごとの結果
  | # | 条件 | 確かめ方 | 結果 | エビデンス |

  ## 自動のテスト
  <pnpm verify の最後の出力、カバレッジの 4 つの数字、Playwright のブラウザごとの通った数>

  ### TDD の記録
  | # | 振る舞い | 先に書いたテスト | 赤（落ちた理由） | 緑にした実装 |
  <振る舞いごとに 1 行。コードの変更が無い PBI は「コードの変更なし」と書く（.claude/rules/tdd.md）>

  ## コードレビュー
  - 判定: APPROVE（N 回目）　範囲: <差分の範囲>　レビューした sub agent: code-reviewer（opus）
  | # | 重さ | 指摘 | 確かめた結果 | 対応（直した commit とテスト / 退けた理由） |
  <コードの変更が無い PBI は「コードの変更なし」と書く（.claude/rules/code-review.md）>

  ## ブラウザでの確認
  | URL | 幅 | テーマ | した操作 | 見えた結果 | 画面の写真 |
  - コンソール: エラー N、警告 N　通信: 失敗 N

  ## 見つけた問題
  <見つけたもの・直した commit・足したテスト・起票した issue。無ければ「なし」>
  ```

- A report with no Chrome screenshot is not a report; `check-docs.mjs` rejects it.
- Reports are snapshots: never rewrite one. A re-test appends a `## 再試験 YYYY-MM-DD` section.
- The report may land in its own commit (`docs(test-report): …`) after the change's CI run, so
  it can cite that run's URL. That commit's CI must be green too.
- Add the report to `docs/test-reports/index.md` (newest first) and a line to `docs/log.md`.

## When the hands-on test finds a problem

- **Inside the PBI's scope:** fix it now, and add a check that reproduces it before the fix
  (a Playwright test for app behavior; a rule or script check for a document or issue defect).
  Then redo items 2–7. Record it under 見つけた問題.
- **Outside the scope:** reproduce it, state its root cause, file a bug PBI
  (`.claude/rules/issue-authoring.md`), and **fix it now, to completion, before resuming**
  (`.claude/rules/bug-handling.md`). It gets its own commit and its own test report; reference
  it in this one.
- Do not stop, do not defer by severity, do not ask the user.
- **If it reveals a rule gap** — something a rule should have prevented — update the rule in
  the same change (`CLAUDE.md`, "Keeping the harness current").
- Never close the issue with a known problem in scope left open.
