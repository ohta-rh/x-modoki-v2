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
6. **Verify.** While working, run only the unit tests and e2e specs the change touches; then,
   right before pushing, `pnpm verify` exits 0 — all seven gates, coverage 100% (ADR-0056). Then check every
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
9. **Commit and push** — to `main`, or to the milestone branch when the user asked for a PR
   (ADR-0029: then tick the DoD and comment on the issue, but let `Closes #N` close it on merge).
   Stage by explicit path; `git diff --check`; message
   references the issue (`Refs #N`); push.
10. **Watch CI to the end.** Green → continue. Red → fix forward now; do not start the next PBI.
    Every red run is recorded under 見つけた問題 in the report of the PBI whose commit fixes it,
    with the run URL (three red runs in M1 were in no report).
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
- Fold unrelated *improvements* into the commit. An adjacent improvement → file a new PBI
  under the right EPIC and move on. An adjacent **bug** is different: fix it now, inside this PBI
  (`.claude/rules/bug-handling.md`, ADR-0056).
- Leave a known bug open, defer one by severity, or label one `blocked`.
- Start Milestone 2 work, or add Cloudflare-specific packages, during Milestone 1.
- Ask the user anything. Decide from the ADRs and rules, or decide yourself and write the ADR.

## 3. When something is wrong — fix it, do not stop, do not ask (ADR-0028)

`.claude/rules/bug-handling.md` is the rule; this is how it meets the loop.

- **A bug, wherever it was found:** reproduce → root cause → failing test → fix → gates →
  Chrome → review → push → CI → record, inside the current PBI whatever its scope (ADR-0056).
  Only a bug found by exploratory testing gets its own issue.
- **An issue whose premise fails** (a library does not behave as assumed, a criterion
  contradicts an ADR, a dependency is missing): apply the fallback the ADR names
  (e.g. ADR-0008: Garage → SeaweedFS; ADR-0017: `proxy.ts` → layout redirect). If none is
  named, decide from the existing ADRs and rules; if they do not answer, decide yourself.
  Either way write the superseding ADR in the same commit, edit the affected issue bodies
  (note what changed and why at the top), and continue.
- **A fix or a review that keeps failing:** escalate every three attempts — back to the last
  green state, question the design, split smaller — and keep going.
- **Never ask the user.** No questions, no options to choose from, no waiting. Decisions go in
  ADRs (決定者: エージェント) and in the final report.
- **Never route around by weakening a gate**, and never take the actions listed as off-limits
  in `.claude/rules/bug-handling.md` §3 — find another way instead.

`blocked` is not used for bugs or for decisions. It exists only for work that physically
cannot proceed without something the user alone holds (an account, a payment, a secret) —
which Milestone 1 does not have (ADR-0019). Such an issue is labelled, explained, skipped
without asking, and reported at the end; the loop carries on.

## 4. Stopping

The loop ends when every sub-issue of the EPIC is closed. A bug, a failed review, a red CI
run, or an unanswered design question is never a stopping point.

The final report lists: issues closed (with SHAs), test reports written, bugs found and fixed
(and the PBI each was fixed in), ADRs added or superseded — marking each decision the loop made itself —
and anything labelled `blocked` with why it could not proceed.

Context limits are not a reason to stop: commit work in progress on a passing state, and the
next iteration resumes from step 1.
