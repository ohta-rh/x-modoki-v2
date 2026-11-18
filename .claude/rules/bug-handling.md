# Bugs — fix to completion, never stop the loop, never ask

Applies whenever anything is found to be wrong: a failing test, a red gate, red CI, something
seen in Chrome, a reviewer's finding, an exploratory-test result, a regression in work already
closed (ADR-0028). This rule overrides any wording elsewhere that says to defer, to label
`blocked`, or to wait for the user.

## 1. Every bug is fixed now, all the way

"All the way" is the whole chain, not the code change:

1. **Reproduce** it with real input. Save the evidence (screenshot, output) before touching anything.
2. **Root cause in one sentence.** If you cannot state it, keep investigating — no fix on a guess.
3. **Failing test first** that reproduces the bug (`.claude/rules/tdd.md`).
4. **Fix** with the smallest change that addresses the root cause.
5. **Gates:** `pnpm verify` green. Then look at it in Chrome.
6. **Independent code review** to `APPROVE` (`.claude/rules/code-review.md`).
7. **Push, CI green.**
8. **Record** it in the test report under 見つけた問題: how it was found, root cause, the test,
   the fixing commit.

- **No deferral by severity.** Critical, high, medium, low — all fixed. There is no
  "known issue" list.
- **No deferral by scope.**
  - Inside the current PBI's scope: fix it inside that PBI.
  - Outside it (code from a closed PBI, an unrelated area, a tool, a document): file a bug PBI
    with its root cause (labels `bug`, `pbi`; `.claude/rules/issue-authoring.md`), then
    **fix it immediately and close it — before resuming the current PBI.** The issue is the
    record, not a queue.
- **Red `main` comes first.** Fix forward at once; if that takes more than one attempt, revert
  the offending commit, then fix.

## 2. The loop does not stop

- `blocked` is never applied to a bug. A bug never causes a PBI to be skipped or the loop to end.
- **When a fix fails, escalate — do not repeat:**
  1. Back to reproduction and root cause. A fix that failed means the cause was wrong.
  2. **Three failed attempts at the same bug:** stop patching. Return to the last green state,
     question the design. Use the fallback the ADR names; if there is none, choose another
     approach and record it in a superseding ADR.
  3. Still failing: split the change into smaller pieces and redo each by TDD.
- **Code review not approved after three rounds:** same ladder. Do not submit a fourth round
  of the same shape — return to the last green state, split smaller, start over, and continue
  until `APPROVE`.
- **Never "fix" by weakening:** no deleting, skipping, or loosening a failing test; no
  coverage exclusion; no disabled lint rule; no lowered threshold; no `continue-on-error`.
  That is hiding the bug, and it counts as not fixed.
- Context or time limits are not a reason to stop: commit on a green state and continue.

## 3. Do not ask the user

- **Inside the loop, never ask the user a question** — no "which do you prefer", no "shall I
  proceed", no presenting options and waiting, no `AskUserQuestion`.
- When a judgment is needed: apply the existing ADRs and rules. If they do not answer it,
  **decide, and write an ADR in the same commit** (決定者: エージェント). The user can overturn
  it later with a superseding ADR.
- List every decision made this way in the loop's final report.
- If the user sends an instruction mid-loop, follow it. This rule forbids the loop from
  *asking*; it does not make the loop deaf.

**Not asking does not widen what you may do.** These are not "do without asking" — they are
"do not do; find another way":

- Force-push, rewrite history, or delete anything you did not create.
- Sign up for a service, enter a secret, or do anything that costs money.
- Publish anything outward that the issue does not authorize.
- Weaken a gate.

Milestone 1 needs no account, payment, or secret (ADR-0019), so no Milestone 1 bug can require
one. If a fix seems to, the approach is wrong: pick one that does not, record the ADR, continue.

## 4. Prevent the next one

- The same kind of bug twice → make it mechanical (a lint rule, a script check with its test,
  a Playwright test) or add it to the relevant rule, in the same change.
- A bug that a rule should have prevented → fix the rule too
  (`CLAUDE.md`, "Keeping the harness current").
