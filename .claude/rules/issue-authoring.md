# Issue Authoring — PBI-style EPIC + issues

Applies whenever work is planned or filed as GitHub issues in this repository.

## 1. Structure: one EPIC, child PBIs

- Every piece of planned work is an **EPIC issue plus child PBI issues**. Do not file a loose
  issue that belongs to no EPIC; if no fitting EPIC exists, create it first.
- **EPIC** = one outcome the user can name (a capability, or a class of defect eliminated).
  It holds the goal, the scope boundary, and the ordered list of children. It holds no
  implementation tasks of its own.
- **PBI** = one vertical slice that delivers observable value on its own and can be
  implemented, verified, and merged independently. Split by behavior, never by layer
  ("backend part" / "frontend part" is not a PBI).
- Link children as GitHub sub-issues of the EPIC, and keep the EPIC's checklist in sync.
- Labels: `epic` on the EPIC, `pbi` on each child. Titles: `[EPIC] <outcome>` /
  `<what the user can do or what stops happening>`.
- A PBI that depends on another PBI names it under 依存関係 (`blocked by #N`). Order the
  children in the EPIC so they can be taken top to bottom.

## 2. Root cause is mandatory before filing

**No issue is filed until its root cause can be stated in one sentence.** An issue written
from a symptom gets fixed at the symptom and comes back.

- **Defect:** reproduce it first with real input, then trace it to the cause. Record the
  reproduction steps, the evidence (file:line, log line, failing query, bisect result), and
  the one-sentence cause. "Probably X" is a hypothesis, not a root cause — keep investigating.
- **Feature / improvement:** the root cause is the underlying problem — who is blocked, by
  what, and why the current system does not cover it. A solution restated as a need
  ("we need a button") is not a root cause.
- If the cause cannot be established, file an **investigation PBI** whose acceptance
  criterion is "root cause identified with evidence" — never an implementation PBI built on
  a guess.
- If several symptoms share one cause, they are one PBI. If one symptom has several causes,
  it is several PBIs.

## 3. No-rework checklist (all must hold before `gh issue create`)

- [ ] Investigated against `origin/main` after `git fetch`, not a stale checkout.
- [ ] Root cause stated in one sentence, with evidence.
- [ ] Acceptance criteria are observable and each is checkable by a command or a concrete
      manual step — no "works correctly", "is improved".
- [ ] Scope and out-of-scope are both written; adjacent problems found on the way are
      filed as separate PBIs, not folded in.
- [ ] Affected files / modules are named, and existing code that already does part of the
      job has been searched for and referenced.
- [ ] No open question is left in the body. Decisions the implementer would otherwise have
      to make (data shape, naming of public interfaces, error behavior, migration) are
      already made and written down; a decision that is genuinely the user's is asked
      before filing, not deferred into the issue.
- [ ] Dependencies and ordering are explicit.
- [ ] The implementer can start from the issue alone, without the conversation that
      produced it.
- [ ] Small enough to land as one PR; otherwise split.

## 4. Templates

### EPIC

```markdown
## ゴール
<達成される成果を1〜2文で>

## 背景・根本原因
<なぜ必要か。根本原因を1文で + 根拠>

## スコープ
- 含む:
- 含まない:

## PBI 一覧（着手順）
- [ ] #N <title>

## 完了条件
<EPIC 全体として観測できる状態>
```

### PBI

```markdown
## ユーザーストーリー
<誰>として、<何>をしたい。なぜなら<理由>。

## 根本原因
<1文>
- 根拠: <file:line / ログ / 再現結果>
- 再現手順（不具合の場合）:

## 受け入れ条件
- [ ] <観測可能な条件> — 確認方法: <コマンド or 手順>

## スコープ
- 含む:
- 含まない:

## 実装方針
<決定済みの設計判断、対象ファイル、再利用する既存コード>

## 依存関係
<blocked by #N / なし>

## 検証
<実行するテスト・コマンド>
```
