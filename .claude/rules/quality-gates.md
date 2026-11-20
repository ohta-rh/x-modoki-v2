---
paths:
  - "src/**"
  - "app/**"
  - "proxy.ts"
  - "e2e/**"
  - "scripts/**"
  - "eslint-rules/**"
  - ".github/**"
  - "*.config.*"
  - "package.json"
  - "docker-compose.yml"
---

# Quality gates — CI, coverage, runtime constraints, milestones

These gates are part of the Definition of Done (`.claude/skills/deliver-pbi/definition-of-done.md`), which
also requires a hands-on test in a real browser for every PBI. Green gates alone are not done.

Applies to every change that touches code, tests, configuration, or CI.
Decided in ADR-0017, ADR-0019, ADR-0020, ADR-0021; this file is the operating rule.

## 1. CI is mandatory (ADR-0073, replacing ADR-0070)

- GitHub Actions runs on every push to `main` and every PR. The `scope` job decides first: when
  every file changed since the last fully verified commit is a document (`docs/`, `.claude/`,
  `README.md`, `CHANGELOG.md`, `CLAUDE.md`, `LICENSE`) that no gate outside `docs:check` reads
  (`GATE_INPUTS` in `scripts/lib/ci-scope.mjs`), only `docs only` runs (`pnpm docs:check`,
  `pnpm format:check`); otherwise the eight gates run — `verify` (the dependency audit, then
  `pnpm docs:check`, `typecheck`, `lint`, `format:check`, `test --coverage`, `build`) and
  `e2e (chromium|firefox|webkit)` at the same time. `fresh-clone` runs the local guide on every push
  (ADR-0069). The scope rule is the user's decision; widening it is too.
- **A change is not done until CI is green on the commit that contains it.** "Passes locally"
  is not a substitute, and a gate that did not run is not a gate that passed.
- **Before pushing:** run `pnpm verify` (the seven gates after the audit) and see it exit 0. The
  audit is CI's alone: its result follows the advisory database, not the change. While working,
  run only the tests the change touches; the full run is once, right before the push (ADR-0056).
- **Join a check and the commit after it with `&&`.** The Bash hook (`scripts/guard-bash.mjs`,
  ADR-0074) refuses `;`, `||`, `&` or a new line before `git commit`/`git push`, `--no-verify`,
  `git add` of everything, and `pkill`/`killall`; the pre-commit hook checks the docs on the staged
  tree. If a hook refuses a command, fix the command; never reshape it to slip past the hook. To
  edit a file, use the editing tools, not a shell heredoc (the hook reads the heredoc too).
  **After pushing:** watch the CI run to its end. Do not end the turn on "CI is running".
- **Dependency update PRs (Dependabot, ADR-0071):** a weekly patch-and-minor PR is taken when its
  CI is green (look at the app in Chrome as for any change). A major update is taken only after an
  ADR for it; a line an ADR pinned (Next.js 16.4, React 19.3, TypeScript 6.0, Node.js 24, Drizzle 0.45) is moved
  by a superseding ADR, never by merging the PR. Playwright gets no Dependabot PR: its version is
  also the image tag in `ci.yml` and `docker-compose.yml`, and the three move in one change (ADR-0047). A red audit is fixed by updating the dependency,
  never by an `--ignore` or a lower `--audit-level`.
- **Red `main` is fixed first.** Nothing else starts until it is green; if it cannot be fixed
  quickly, revert the commit.
- **Never weaken a gate to get green:** no `continue-on-error`, no `.skip` / `.only` / `.todo`
  left in tests, no `--no-verify`, no deleting or loosening a failing check, no lowering a
  threshold, no `eslint-disable` / `@ts-expect-error` without a one-line reason on the same line.
  Taking a browser or engine out of one check, even for a reproduced upstream crash, is a gate
  change: it needs an ADR with the reproduction, and it is the user's decision (ADR-0055) — skip
  that work and report it rather than finding out through a blocked command.
- **The docs are checked on the staged tree before every commit** (#39): `.githooks/pre-commit`
  runs `scripts/check-staged.mjs`, turned on by `scripts/setup-local.sh`. Never bypass it.
- The CI workflow and the app scaffold land in the same PBI. No feature PBI starts before CI
  exists and is green.
- Node.js and pnpm versions come from `.nvmrc` and `packageManager`; never hard-code them in
  the workflow.
- **Your local Node.js may not be the `.nvmrc` version.** A gate that passes locally on a
  newer Node can fail in CI (2026-11-18: `node --test <directory>` works on Node 26 and fails
  on Node 24). Check `node -v` against `.nvmrc` before trusting a local pass; when they
  differ, say so in the test report and treat the CI run as the real result. Prefer forms
  that do not depend on the Node version (name the test file, not a directory).

## 2. Coverage is 100% (ADR-0021)

- Vitest (V8) thresholds are **100% for lines, branches, functions, and statements**, measured
  over all of `src/**`, `app/**/route.ts`, and `proxy.ts`, including files no test imports.
- **Only these may be excluded**, and only in the single list in `vitest.config.ts`, each with
  its reason: root `app/**/{page,layout,default,not-found,error,global-error}.tsx` (`not-found` per ADR-0039, `error` / `global-error` per ADR-0062), `src/shared/ui/kit/**`,
  `src/shared/db/schema/**`, type-only files (paths per ADR-0022). Adding to the list or lowering a threshold
  requires a new ADR.
- **Excluded files hold no decisions.** A `page.tsx` / `layout.tsx` / `default.tsx` may only
  read params, call the data access layer, pass the result to a synchronous component, and
  wrap in `<Suspense>`. Conditionals, formatting, and computation go in a synchronous
  component in `src/_pages` or a function in `src/shared/lib`.
- **Async Server Components exist only in root `app/`.** Every component under `src/` is
  synchronous and unit-tested.
- **Every page route has at least one Playwright test** — that is what covers the excluded files.
- **Check the docs on what you commit, not on the working tree.** `check-docs` passes while a
  report you have not staged sits beside it; committing `docs/log.md` or an index that links it then
  breaks CI (6c382f4, found in #28). When staging part of the docs, run
  `git stash push --keep-index -u -- docs && node scripts/check-docs.mjs; git stash pop` first.
- **E2e tests scroll at once, never by wheel (ADR-0049).** `page.mouse.wheel` keeps moving after the
  test reads the position; it flaked twice (#56, #28) and ESLint now rejects it under `e2e/`. Use
  `window.scrollTo` / `scrollBy` with `behavior: 'instant'`, then `expect.poll` the position.
- **Read a position after a focus move with `expect.poll`, never once (#36).** WebKit scrolls the
  focused control into view at its next rendering, Chrome at once; a single read after
  `keyboard.press('Tab')` passed locally and failed once in CI (run 44555176296).
- **Wait for the action to finish before moving on in an e2e test (#50, seven times in M1).** After a
  click that sends a Server Action, a `router.refresh()`, or a fire-and-forget request, wait for its
  response to finish (`(await response).finished()`) or for its visible result before `goto`, Back,
  or reading state: WebKit and Firefox interrupt the navigation otherwise.
- **Never rebuild `.next` while a server from it is in use** (a hands-on check, an exploratory
  tester, Lighthouse): it breaks that server (#32, #34). Stop it first or wait.
- **Stop your own servers by PID, not by name.** `next start` renames itself to `next-server`, so
  `pkill -f "next start"` misses it and the next check hits a stale build (found in #15). Check
  `lsof -iTCP:<port> -sTCP:LISTEN` before a browser test; never touch a process you did not start.
- `pnpm test:e2e` runs on Chromium, Firefox, and WebKit in CI, and keeps the screenshot and
  trace of a failure as an artifact (ADR-0024).
- No coverage-ignore comments (`/* v8 ignore */`, `/* istanbul ignore */`, `/* c8 ignore */`).
  A branch that cannot be reached by a test is deleted, not ignored.
- **Write the test first** (`.claude/rules/tdd.md`): 100% coverage reached by back-filled
  tests does not satisfy this rule. Test and code land in the same commit. Data access layer, Server Actions, and
  Route Handlers are tested against the real PostgreSQL from Docker Compose — never a mocked
  Drizzle (ADR-0013).
- A test must assert behavior. A test that only executes lines to move the number is a defect.

## 3. Server code must run on Cloudflare Workers (ADR-0017, ADR-0018)

Production is Cloudflare Workers via `@opennextjs/cloudflare`. From the first commit, server
code (anything not behind `'use client'`) must not use:

| Forbidden | Use instead |
|---|---|
| Native modules (`sharp`, `bcrypt`, `canvas`, …) | Browser-side image conversion; pure-JS / Web Crypto |
| Writing to the filesystem (`node:fs` writes, temp files) | S3-compatible storage, PostgreSQL |
| A connection or pool created at module top level | `getDb()` — one per request, memoized with React `cache()` |
| Module-level mutable state kept across requests (in-memory cache, counters, rate limits) | PostgreSQL, `'use cache'` |
| `setInterval`, long-lived sockets, anything assuming a persistent process | Polling from the client, Cron Triggers |

Do not use vinext, `output: 'standalone'`, or Cloudflare D1 — each was considered and rejected
in ADR-0017.

## 4. Milestones (ADR-0019)

- **Milestone 1 — "runs locally":** every feature in section 1 of `docs/architecture/scope.md`
  works with `docker compose up -d` + `pnpm dev`, CI is green, coverage is 100%. It needs no
  Cloudflare account, Wrangler config, or production secret.
- **Milestone 2 — "runs on Cloudflare":** deployment, Hyperdrive, R2, Cron Triggers. Its first
  PBI verifies Cache Components, `proxy.ts`, Better Auth, and Drizzle-over-Hyperdrive on the
  Workers runtime (`opennextjs-cloudflare preview`).
- Do not start Milestone 2 work, or add Cloudflare-specific packages, during Milestone 1.
- Every EPIC and PBI is assigned to a GitHub milestone.
