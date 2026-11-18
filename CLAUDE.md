# x-modoki-v2

A single all-in-one Next.js application whose UI/UX follows X (x.com) as closely as possible.
Production target is Cloudflare Workers; the first milestone is "everything runs locally".
Architecture, stack, and UI specification: start at `docs/index.md`.

## Issue workflow

- **Work is planned as a PBI-style EPIC + child issues.** One EPIC per outcome; each child
  is a PBI — an independently deliverable vertical slice with a user story and verifiable
  acceptance criteria.
- **Identify the root cause before writing any issue.** If it cannot be stated in one
  sentence with evidence, investigate further (or file an investigation PBI) — never file
  an implementation issue on a guess.
- **Write issues that cause no rework:** every decision the implementer needs is already
  made, scope and out-of-scope are explicit, and the issue is self-sufficient.

Full rules, checklist, and templates: @.claude/rules/issue-authoring.md

## Documentation and decisions

- **`docs/` is an Open Knowledge Format (OKF) v0.2 bundle.** Every Markdown document under it
  starts with YAML frontmatter carrying `type`; each directory has an `index.md`.
- **Every architecture, technology, or cross-cutting-rule decision adds an ADR** under
  `docs/adr/` in the same commit. Accepted ADRs are superseded, never edited.
- Read the existing ADRs before proposing a change to the stack or structure.

Full rules: @.claude/rules/documentation.md

## Architecture

- **Feature-Sliced Design.** `src/` holds only the six layers `_app`, `_pages`, `widgets`,
  `features`, `entities`, `shared`; imports go strictly downward; slices are entered through
  `index.ts` / `index.server.ts`.
- **Root `app/` is routing only.** Async Server Components live there and nowhere else, and do
  nothing but load data and render a synchronous `_pages` component.
- **Database code lives only in `api` segments** (`entities/*/api` reads, `features/*/api`
  mutations), each `server-only`, each authorizing and returning DTOs.

Full rules: @.claude/rules/architecture-fsd.md

## Quality gates

- **CI is mandatory.** A change is done only when GitHub Actions is green on its commit. Run
  `pnpm verify` before pushing, watch the run after pushing, fix a red `main` before anything else.
- **Coverage is 100%** (lines, branches, functions, statements). Only the four file kinds listed
  in ADR-0021 are excluded, and they hold no logic. No coverage-ignore comments.
- **Server code must run on Cloudflare Workers:** no native modules, no filesystem writes, no
  module-level connections or cross-request state.
- **Milestone 1 is "runs locally"**; Cloudflare deployment is Milestone 2 and does not start early.

Full rules: @.claude/rules/quality-gates.md

## Test-driven development

- **Implementation is always TDD.** Red → green → refactor, one behavior at a time. No
  production code without a failing test that demands it; never trust a test you have not
  seen fail; a bug fix starts with a failing test that reproduces it.
- Work outside-in: the failing Playwright test for the acceptance criterion comes first.
- **Record every red** in the test report's `TDD の記録` table as it happens. No record, no TDD.

Full rules: @.claude/rules/tdd.md

## Code review

- **Every code-changing PBI gets an independent review before push:** a fresh `code-reviewer`
  subagent (opus, read-only), given only the issue number and the diff range — never your
  summary or reasoning.
- Verify each finding yourself; fix real ones test-first, reject wrong ones with evidence;
  re-review with a new subagent until `APPROVE`. Record the outcome in the test report.

Full rules: @.claude/rules/code-review.md — reviewer definition: `.claude/agents/code-reviewer.md`

## Definition of Done

- **One definition, ten items, no exceptions:** acceptance criteria checked one by one,
  implemented by TDD, independently reviewed, `pnpm verify` green, Playwright covering every browser-observable criterion on Chromium /
  Firefox / WebKit, a hands-on look in Chrome, CI green, ADRs and documents updated, a test
  report with evidence, then the closing comment.
- **Always look at it in real Chrome.** For every PBI — including server-only,
  documentation-only, and issue-filing work — open the result in Chrome, exercise the change
  and a failure path at 1280 / 768 / 375px, confirm a clean console, and save screenshots.
  A passing script is not a look.
- **Always leave a test report with evidence** under `docs/test-reports/` (screenshots under
  `docs/test-reports/evidence/`) before closing. No screenshot, no report; no report, not done.
- Every PBI body carries the ten items as a 完了の定義 checklist.

Full rules: @.claude/rules/definition-of-done.md

## Delivery loop

- **One PBI at a time, in the EPIC's order, start to closed:** read the issue and its ADRs,
  implement by TDD, `pnpm verify`, look in Chrome, independent review, push to `main`, watch CI
  to green, write the test report, close with evidence. Never close on an unmet criterion, a
  skipped gate, or red CI.
- The loop ends only when every sub-issue is closed.

Full rules: @.claude/rules/delivery-loop.md

## Bugs — fix to completion, never stop, never ask

- **Every bug is fixed now, all the way** — reproduce, root cause, failing test, fix, gates,
  Chrome, review, push, CI, record — whatever its severity and wherever it was found. A bug
  outside the current PBI gets a bug PBI and is fixed immediately, before resuming.
- **The loop does not stop.** No `blocked` for bugs. After three failed attempts, change the
  approach (last green state, question the design, split smaller) and keep going.
- **Do not ask the user.** Decide from the ADRs and rules, or decide yourself and write the ADR
  in the same commit; list those decisions in the final report.
- Not asking does not widen authority: no force-push, no deleting what you did not create, no
  sign-ups, payments, or secrets, no weakened gates — find another way.

Full rules: @.claude/rules/bug-handling.md

## Keeping the harness current

The rules under `.claude/rules/` and the ADRs under `docs/adr/` are the project's harness.
When a decision, a recurring mistake, or a new constraint appears, update the rule and the
ADR in the same commit as the change that prompted it — a rule that lives only in a
conversation does not exist for the next session.
