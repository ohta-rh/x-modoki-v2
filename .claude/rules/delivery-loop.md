# Delivery loop — working through an EPIC's sub-issues unattended

Applies when asked to implement an EPIC, a milestone, or "the next issue", including runs
under `/loop`. The goal is that one loop carries a milestone from its first open sub-issue to
its last without a human in between.

## 1. One iteration = one PBI, start to closed

1. **Ground truth.** `git fetch origin`; confirm `main` is not behind and CI on `origin/main`
   is green. Red `main` is fixed before anything else (`.claude/rules/quality-gates.md`).
2. **Pick.** List the EPIC's sub-issues in their stated order; take the first one that is
   open and whose `blocked by` issues are all closed. Never skip ahead of an open blocker.
3. **Read.** The issue body is the spec. Read the ADRs and architecture documents it links.
   Do not re-decide anything an ADR already answers.
4. **Baseline.** Run `pnpm verify` before changing anything and note the result. (Before the
   scaffold exists: `node scripts/check-docs.mjs`.)
5. **Implement by TDD — always** (`.claude/rules/tdd.md`), inside the slices the issue names
   (`.claude/rules/architecture-fsd.md`). Start with the failing Playwright test for the
   acceptance criterion; then one behavior at a time: write the test, watch it fail for the
   expected reason, write the least code to pass, refactor. Note each red in the TDD record as
   it happens. Tests land in the same commit as the code.
6. **Verify.** `pnpm verify` exits 0 — all seven gates, coverage 100%. Then check every
   acceptance criterion in the issue by the method the issue states, one by one.
   **Then look at it in real Chrome** against `pnpm build && pnpm start`: the change itself, a
   failure path, three widths, the themes it touches, a clean console — saving screenshots
   (`.claude/rules/definition-of-done.md`). Fix what it finds before going on.
7. **Independent code review — before pushing** (`.claude/rules/code-review.md`). Commit
   locally, then spawn a fresh `code-reviewer` subagent with only the issue number and the diff
   range. Verify each finding yourself; fix the real ones test-first, reject the wrong ones with
   evidence; re-run step 6; get a new reviewer until the verdict is `APPROVE`. Skip only when
   the PBI changes no code.
8. **Record decisions.** Any architecture / technology / cross-cutting decision made on the
   way gets an ADR in the same commit (`.claude/rules/documentation.md`).
9. **Commit and push to `main`.** Stage by explicit path; `git diff --check`; message
   references the issue (`Refs #N`); push.
10. **Watch CI to the end.** Green → continue. Red → fix forward now; do not start the next PBI.
11. **Write the test report.** `docs/test-reports/issue-NNNN-<summary>.md` with the screenshots
    under `docs/test-reports/evidence/`: every acceptance criterion with its result and
    evidence, the gate output, the TDD record, the code review outcome, the Chrome record. Push it; its CI run must be green too.
12. **Close — only when the Definition of Done holds.** Tick every item in the issue's
    完了の定義 section. Comment: commit SHA, CI run URL, link to the test report. Then close it and
    tick it in the EPIC's list.

## 2. What the loop never does

- Close an issue with an unmet acceptance criterion, a skipped gate, red CI, no hands-on look
  in Chrome, or no test report with screenshots. The Definition of Done has no exceptions.
- Write production code before a failing test, or back-fill tests after the code.
- Push code that an independent reviewer has not approved, review its own work in place of
  the `code-reviewer` subagent, or hand the reviewer its own summary or reasoning.
- Weaken a gate, exclude a file from coverage, or disable a lint rule to finish.
- Fold work outside the issue's scope into the commit. Found something adjacent → file a new
  PBI under the right EPIC (root cause stated, `.claude/rules/issue-authoring.md`) and move on.
- Start Milestone 2 work, or add Cloudflare-specific packages, during Milestone 1.
- Ask the user something an ADR, a rule, or the issue already answers.

## 3. When the issue turns out to be wrong

An issue is wrong when its root cause, approach, or acceptance criteria cannot hold (the
library does not behave as assumed, a criterion contradicts an ADR, a dependency is missing).

- **A verification / investigation PBI found that an assumed technology does not work:** apply
  the fallback the ADR names (e.g. ADR-0008: Garage → SeaweedFS; ADR-0017: `proxy.ts` → layout
  redirect). Record it in a superseding ADR, update the affected issue bodies, continue.
- **No fallback is named and one option is clearly forced by the existing ADRs:** decide,
  write the ADR, edit the issue (note what changed and why at the top), continue.
- **The remedy is genuinely contested** — it would reverse a decision the user made, change
  scope, or need an account / secret / payment: stop that issue, comment the evidence and a
  recommendation on it, label it `blocked`, and continue with the next issue that does not
  depend on it. Report it at the end of the loop.

## 4. Stopping

The loop ends when every sub-issue of the EPIC is closed, or when every remaining open issue
is `blocked`. The final report lists: issues closed (with SHAs), ADRs added or superseded,
test reports written, issues filed during the loop, and anything left `blocked` with its
recommendation.

Context limits are not a reason to stop: commit work in progress on a passing state, and the
next iteration resumes from step 1.
