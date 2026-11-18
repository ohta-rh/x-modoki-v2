# Code review — an independent subagent, every code-changing PBI

Applies to every PBI that changes executable code, tests, configuration, or CI (ADR-0027).
It is item 6 of the Definition of Done (`.claude/rules/definition-of-done.md`) and step 7 of
the delivery loop (`.claude/rules/delivery-loop.md`). The reviewer's own instructions live in
`.claude/agents/code-reviewer.md` — that file is the single definition of what a review checks.

## When

After `pnpm verify` is green and the hands-on check in Chrome is done; **before `git push`**.
This repository pushes straight to `main`, so the review is the only second pair of eyes a
change ever gets. Commit locally first so the reviewer has a stable range.

A PBI that changes only documents under `docs/` or issue bodies needs no code review; its test
report says `コードの変更なし` under `## コードレビュー`.

## How to spawn the reviewer

- Agent type `code-reviewer` (defined in `.claude/agents/code-reviewer.md`, `model: opus`).
  If that type is not available in the session, spawn `general-purpose` with an explicit
  `model: "opus"` and tell it to read and follow that file. Never let the reviewer inherit the
  author's model by omission, and never use a `fork` — a fork carries your context.
- **Give it only two things: the issue number and the diff range** (`origin/main...HEAD`).
  Do not give it your summary, your reasoning, what you tested, what you are unsure about, or
  what you think is fine. Independence is the whole value; a reviewer handed your conclusion
  returns it confirmed.
- One reviewer per round. No `name` (it must not become a persistent teammate). It is
  read-only, so it needs no worktree.
- Wait for its result. Do not run the same review yourself in parallel.

## What to do with the result

1. **Verify every finding yourself before acting.** Open the line, reproduce the failure the
   reviewer describes. Reviewers are wrong as often as authors.
2. **A real finding:** write a failing test that reproduces it first, then fix
   (`.claude/rules/tdd.md`). Every real finding is fixed now — `blocker`, `major`, and
   `minor` alike. None is deferred (`.claude/rules/bug-handling.md`).
3. **A wrong finding:** reject it with the evidence (the line, the test, the command output).
   Do not "fix" something that is not broken to make the reviewer happy.
4. **A real finding outside the PBI's scope:** file a bug PBI and fix it immediately, in its
   own commit with its own review, before resuming.
5. After any change, re-run `pnpm verify`, then spawn a **new** reviewer on the new range —
   never continue the previous one, which is now anchored on its earlier reading.
6. **`APPROVE` with `minor` findings:** fix each real one test-first, applying the fix the
   reviewer proposed. That needs no further round — the reviewer has already judged the fix.
   Anything beyond the proposed fix is a new change and gets a new round.
7. Repeat until the verdict is `APPROVE`. **Three rounds without approval:** do not submit a
   fourth of the same shape, do not label it `blocked`, do not ask the user. Return to the
   last green state, split the change smaller, redo it by TDD, and keep going until approved.
8. If a finding shows a rule gap, update the rule and `.claude/agents/code-reviewer.md` in the
   same change.

## The record

The test report carries a `## コードレビュー` section (ADR-0025):

```markdown
## コードレビュー
- 判定: APPROVE（2 回目）　範囲: origin/main...HEAD　レビューした sub agent: code-reviewer（opus）

| # | 重さ | 指摘 | 確かめた結果 | 対応 |
|---|---|---|---|---|
| 1 | major | `likePost` が削除済みの投稿を弾かない（`api/like.ts:31`） | 再現した | 直した。テスト: `like.test.ts` › 削除済みは NOT_FOUND |
| 2 | minor | `formatCount` が負の数で崩れる | 再現しない（呼び出し元は 0 以上だけを渡す。`counts.ts:12`） | 退けた |
```

- Quote findings as the reviewer wrote them; do not soften or drop any.
- `check-docs.mjs` rejects an `issue-NNNN-*` test report with no `## コードレビュー` section.

## What review is not

- Not a replacement for TDD, the gates, or the look in Chrome — it comes after them.
- Not self-review. Re-reading your own diff is good practice and does not satisfy this rule.
- Not a rubber stamp. An `APPROVE` obtained by telling the reviewer what to conclude is void.
