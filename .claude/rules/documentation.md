# Documentation — `docs/` is an OKF bundle, decisions are ADRs

Applies whenever a Markdown document is added, changed, moved, or removed in this repository.
Decided in ADR-0001 (ADRs) and ADR-0002 (OKF); this file is the operating rule.

## 1. `docs/` is an Open Knowledge Format (OKF) v0.2 bundle

Spec: `GoogleCloudPlatform/open-knowledge-format` `SPEC.md` (v0.2, verified 2026-11-18).

- **All project documentation lives under `docs/`**, the bundle root. Do not scatter design
  notes in the repo root, `src/`, or issue comments.
- **Every `.md` under `docs/` starts with YAML frontmatter**, except the reserved names
  `index.md` and `log.md`.

  ```yaml
  ---
  type: Architecture        # required, non-empty
  title: "…"                # same as the body's H1
  description: "…"          # exactly one sentence
  tags: [a, b]              # YAML list
  status: draft             # draft | stable | deprecated
  ---
  ```

- **`type`**: reuse a value already listed in `docs/index.md` (`ADR`, `Template`,
  `Reference`, `Architecture`, `Design`, `Research`, `Guide`) before inventing one. A new
  type is added to that list in the same commit.
- **One concept per file; the path is the concept's ID.** Do not put two subjects in one
  file, and do not move or rename a file without fixing every link to it in the same commit.
- **`index.md`** — one per directory, no frontmatter (only `docs/index.md` carries
  `okf_version: "0.2"`). Body is headings plus `* [Title](path) - description`, the
  description copied from the target's frontmatter. Adding, removing, or re-describing a
  document updates its directory's `index.md` in the same commit.
- **`docs/log.md`** — newest first, `## YYYY-MM-DD` headings. Every commit that adds,
  deprecates, or changes the substance of a document adds one line.
- **Links between documents are relative Markdown links** (`../adr/0003-….md`), not
  bundle-absolute `/…` paths: they must also resolve when rendered on GitHub.
- **Do not write** `generated`, `verified`, `sources`, or `stale_after`. Provenance goes in
  the body: a survey date line and a 参考リンク section. A version, price, or limit is
  written with the date it was verified.
- **Outside the bundle:** root `README.md`, `CLAUDE.md`, and `.claude/**` keep the format
  their tools require and carry no OKF frontmatter.

## 2. Document kinds — never mix

| Kind | `type` | Where |
|---|---|---|
| Decision (why) | `ADR` | `docs/adr/NNNN-kebab-title.md` |
| Current design (what it is now) | `Architecture` / `Design` | `docs/architecture/` |
| Evidence gathered for a decision | `Research` | `docs/research/` |
| How to run / operate | `Guide` | `docs/guides/`; root `README.md` only links to it |
| Work to do | — | GitHub EPIC / PBI issues, **never a document** |

- Architecture documents describe the present state and link to the ADR that decided each
  point; they do not re-argue it. When a decision changes, add the ADR first, then update the
  architecture document in the same commit.
- Research documents are a dated snapshot. Do not edit their findings later; add a new
  research document and set the old one to `status: deprecated`.
- No task lists or checklists in any document.

## 3. ADRs in this repository

The global rule `~/.claude/rules/adr.md` applies; these are the local conventions.

- Location `docs/adr/`, file `NNNN-kebab-title.md`, template `docs/adr/template.md`, index
  `docs/adr/README.md` (a table with the status column; `docs/adr/` has no `index.md`).
- Written in Japanese. Frontmatter `type: ADR`, `title` identical to the H1 (`ADR-NNNN: …`).
- The body's ステータス line is the source of truth; frontmatter `status` mirrors it and is
  changed in the same commit: 提案 → `draft`, 採用 → `stable`, 却下 / 廃止 / 置き換え →
  `deprecated`.
- Adding an ADR updates `docs/adr/README.md` and `docs/log.md` in the same commit.

## 4. Before committing a documentation change

Run `node scripts/check-docs.mjs` (also `pnpm docs:check`, and the first CI gate). It must exit 0.
It checks the list below mechanically; when a new documentation rule is added here, add the
check to that script in the same commit.

- [ ] Every non-reserved `.md` under `docs/` has frontmatter with a non-empty `type`.
- [ ] Every relative link resolves to an existing file.
- [ ] The directory's `index.md` (or `docs/adr/README.md`) and `docs/log.md` are updated.
- [ ] An ADR's frontmatter `status` matches its body.
