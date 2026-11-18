# Definition of Done

The single definition of "done" for every PBI in this repository (ADR-0024, with ADR-0020,
ADR-0021, ADR-0023). An issue is closed only when **every** item below holds. There is no
partial done, and no item is waived because a change "is small" or "has no UI".

## The checklist

1. **Acceptance criteria.** Every criterion in the issue is met and was checked by the method
   the issue states — one by one, not by inference from green tests.
2. **Gates.** `pnpm verify` exits 0 locally (docs, typecheck, lint + Steiger, format,
   test with 100% coverage, build, e2e). Nothing skipped, nothing weakened
   (`.claude/rules/quality-gates.md`).
3. **Automated browser test.** Every acceptance criterion that is observable in a browser has
   a Playwright test, and the suite passes in CI on **Chromium, Firefox, and WebKit**.
4. **Hands-on browser test.** You opened the running app in a real browser and exercised the
   change yourself (details below), and recorded what you saw.
5. **CI.** GitHub Actions is green on the commit that contains the change — watched to the end.
6. **Decisions and documents.** Any architecture / technology / cross-cutting decision has an
   ADR in the same commit; affected documents under `docs/` and rules under `.claude/rules/`
   are updated; `node scripts/check-docs.mjs` passes.
7. **Evidence on the issue.** The closing comment contains the commit SHA, the CI run URL,
   each acceptance criterion with how it was verified, and the hands-on browser record.

## Hands-on browser test (item 4) — always, for every PBI

**What to run against.** The production build: `pnpm build && pnpm start`, with
`docker compose up -d` and seeded data. `pnpm dev` alone does not count — Cache Components and
`<Suspense>` behave differently there.

**How.** Use a real browser through the Chrome DevTools MCP tools or the Claude-in-Chrome
tools. Only if neither is available: run Playwright headed (`pnpm test:e2e --headed`) plus a
scripted walk-through that saves screenshots and the console log.

**What to check, every time:**

- The change itself: perform each user-visible behavior the PBI adds or alters, including one
  failure path (invalid input, logged out, not found).
- Three widths: **1280px, 768px, 375px**. Layout holds; nothing overflows or overlaps.
- Themes: every theme the change touches (all three for anything with color or borders).
- **Console: zero errors and zero warnings** caused by the app. Network: no failed or
  unexpected requests.
- Keyboard: the new controls are reachable by Tab and show a focus ring.
- One neighbouring screen you did not change, to catch collateral breakage.

**When the PBI has no screen of its own:**

| Kind of PBI | Hands-on browser test |
|---|---|
| Server-only change (Route Handler, Server Action, `api` segment, schema) | Exercise it through a screen that uses it. If none exists yet, open or call the URL from the browser and inspect the response in the network panel |
| Documentation only | Open the rendered document on GitHub (after push) and confirm tables, links, code blocks, and diagrams render and resolve |
| Tooling / CI / config | Open the app in the browser and confirm it still loads and the console is clean; open the CI run page and confirm every job is green |
| Investigation in a throwaway app | Run the throwaway app in the browser; the observations go into the research document |

**What to record** (in the closing comment, under a `### ブラウザでの確認` heading):

```
- 対象: <commit SHA>、pnpm build && pnpm start
- 開いた URL: /home, /taro/status/123, …
- 幅: 1280 / 768 / 375 　テーマ: light / dim / dark
- した操作と見えた結果:
  - <操作> → <結果>
- 失敗の経路: <操作> → <結果>
- コンソール: エラー 0、警告 0 　通信: 失敗 0
- 見つけた問題: なし | #N に起票 | この commit で修正（テスト: e2e/….spec.ts）
```

A "confirmed in the browser" with no such record counts as not confirmed.

## When the hands-on test finds a problem

- **Inside the PBI's scope:** fix it now, and add a Playwright test that reproduces it before
  the fix. Then redo items 2–5.
- **Outside the scope:** reproduce it, state its root cause, file a PBI
  (`.claude/rules/issue-authoring.md`), and reference it in the record. Do not fold the fix in.
- Never close the issue with a known problem in scope left open.
