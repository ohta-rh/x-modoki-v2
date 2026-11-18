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

## Delivery loop

- **One PBI at a time, in the EPIC's order, start to closed:** read the issue and its ADRs,
  implement test-first, `pnpm verify`, push to `main`, watch CI to green, close the issue with
  evidence. Never close on an unmet criterion, a skipped gate, or red CI.
- When an issue's premise fails, apply the fallback its ADR names and record a superseding
  ADR; only a genuinely contested remedy is labelled `blocked` and left for the user.

Full rules: @.claude/rules/delivery-loop.md

## Keeping the harness current

The rules under `.claude/rules/` and the ADRs under `docs/adr/` are the project's harness.
When a decision, a recurring mistake, or a new constraint appears, update the rule and the
ADR in the same commit as the change that prompted it — a rule that lives only in a
conversation does not exist for the next session.
