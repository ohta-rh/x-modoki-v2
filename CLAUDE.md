# x-modoki-v2

A single all-in-one Next.js application whose UI/UX follows X (x.com) as closely as possible.
Milestone 1 ("runs locally", `0.1.0`) is done; Milestone 2 ("runs on Cloudflare", EPIC #91) is
next and does not start its Cloudflare work early. Architecture, stack and UI: `docs/index.md`.

## Commands

- First setup and every day: `sh scripts/setup-local.sh` (containers, `.env.local`, the git
  hook), then `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev`. Guide: `docs/guides/local-development.md`.
- Before every push: `PORT=3300 pnpm verify` (docs, types, lint, format, unit tests with 100%
  coverage, build, Playwright on Chromium, Firefox and WebKit). While working, run only the tests
  the change touches.
- Look in real Chrome: `pnpm build && pnpm start`, then
  `node scripts/chrome-evidence.mjs --out <dir> <name>=<url>` for the 1280 / 768 / 375 shots.

## How work is done

- **Plan** as a PBI-style EPIC with child issues, each with a one-sentence root cause and
  verifiable acceptance criteria. Use the `file-issues` skill before any `gh issue create`.
- **Deliver** one PBI at a time, issue to closed, with the `deliver-pbi` skill: TDD, `pnpm verify`,
  a look in real Chrome, an independent `code-reviewer` subagent before the push, CI to green, a
  test report with screenshots in `docs/test-reports/`, the closing comment. Its reference files
  hold the Definition of Done, the review procedure and the bug procedure.
- **Bugs** are fixed now and all the way, inside the PBI that found them (ADR-0056). The loop does
  not stop and does not ask the user: decide from the ADRs, or decide and write the ADR.
- **Decisions** about architecture, technology or a cross-cutting rule get an ADR in `docs/adr/` in
  the same commit; read the existing ADRs before changing the stack or structure.
- **The user's alone:** accounts, payments, secrets, merging, publishing a release, and any change
  to what a gate checks. Never force-push or delete what you did not create.

## Rules that load when you touch the files

`.claude/rules/` holds the rules for each kind of file; each loads when you open a matching file.

| Rule | Loads for | In short |
|---|---|---|
| `architecture-fsd.md` | `src/`, `app/`, `proxy.ts` | Feature-Sliced Design; root `app/` is routing only; DB code only in `api` segments |
| `quality-gates.md` | code, tests, scripts, CI, config | CI is mandatory; coverage is 100%; server code runs on Workers; e2e waits |
| `tdd.md` | code, tests, scripts | red → green → refactor, one behavior at a time, every red recorded |
| `documentation.md` | `docs/`, README, CHANGELOG | `docs/` is an OKF bundle; decisions are ADRs, superseded never edited |

## What machines enforce

- Hooks in `.claude/settings.json` (ADR-0074): the Bash hook refuses staging everything, skipping
  checks with `--no-verify`, a commit or push after `;`/`||`/a new line, and stopping processes by
  name; the edit hook formats each edited file with Prettier. `.env.local` cannot be read.
- `.githooks/pre-commit` checks the docs on the staged tree (ADR-0072).
- CI (ADR-0073): documents-only pushes run the light checks; anything else runs every gate, with
  the browser tests split by browser.

## Keeping the harness current

When a decision, a recurring mistake, or a new constraint appears, change the rule, the skill or
the hook and add the ADR in the same commit as the change that prompted it. A mistake that happens
twice becomes a check (a hook, a lint rule, a script or a test), not a longer rule.
