# x-modoki-v2

A single all-in-one Next.js application whose UI/UX follows X (x.com) as closely as possible.
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
