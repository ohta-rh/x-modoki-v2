# Architecture — Feature-Sliced Design on Next.js

Applies to every file under `app/`, `src/`, and `proxy.ts`. Decided in ADR-0022 (structure),
ADR-0010 (data access), ADR-0021 (coverage); `docs/architecture/application-structure.md`
is the reference. This file is the operating rule.

## 1. Where code goes

```
app/            Next.js routing only (project root, NOT src/app)
proxy.ts        coarse login redirect only
src/
  _app/         app-wide init: entrypoint (providers), styles, api-routes (Route Handler implementations)
  _pages/       one screen: synchronous page component + its data loader
  widgets/      large self-contained blocks composed of features and entities
  features/     one user action: Server Action + its UI
  entities/     business objects: read queries, DTO types, their presentation
  shared/       business-agnostic foundation: ui, lib, config, db, auth, storage, api
```

- **Nothing else may sit directly under `src/`.** No `components/`, `hooks/`, `utils/`,
  `server/`, `types/` — put it in the layer and segment it belongs to.
- **Import direction is strictly downward:** `app` → `_app` / `_pages` → `widgets` → `features`
  → `entities` → `shared`. A slice never imports a slice on the same layer or above.
- Decide the layer by this test, top to bottom, and stop at the first yes:
  1. Is it a route file Next.js requires? → `app/`
  2. Does it compose one whole screen? → `_pages`
  3. Is it a reusable block combining several features/entities? → `widgets`
  4. Is it one thing the user *does* (a mutation)? → `features`
  5. Is it one thing the business *has* (read, type, display)? → `entities`
  6. Does it know nothing about the business? → `shared`

## 2. Inside a slice

- Segments by purpose only: `ui`, `api`, `model`, `lib`, `config`. Not `components`,
  `hooks`, `utils`, `types`.
- **Public API:** every slice has `index.ts`; outside code imports only from it
  (`@/entities/post`). Server-only exports (queries in `api`) go through `index.server.ts`
  (`@/entities/post/index.server`). Never deep-import into another slice.
- `shared` has no slices: each segment / component has its own `index.ts`. No single
  `src/shared/index.ts` barrel.
- Cross-entity references use `entities/<A>/@x/<B>.ts` only. `@x` is forbidden on every
  other layer.
- Slice names are kebab-case; features are named verb-last by the action
  (`post-like`, `user-follow`), entities by the noun (`post`, `user`).

## 3. Data access (ADR-0010)

- **Database code lives only in `api` segments**: reads in `entities/*/api/`, mutations in
  `features/*/api/`. Each file starts with `import 'server-only'`.
- Every `api` function: get the session → authorize → query → return a DTO (IDs as strings,
  no raw rows, no password hash / email / internal columns).
- `src/shared/db` holds only `getDb()` and the schema. It is imported only from `api`
  segments, `src/shared/db`, and `src/shared/auth`. Queries are not written in `shared`.
- Server Actions: `features/*/api/actions.ts` (`'use server'`) — Zod-validate, call the
  mutation, return `{ ok, … }`. No business logic in the action file itself.
- Route Handlers: implement in `src/_app/api-routes/`; `app/api/**/route.ts` only re-exports
  (`export { getTimeline as GET } from '@/_app/api-routes'`). A state-changing Route Handler is a
  POST that refuses an `Origin` other than its own (T-11).
- **Every entry has tagged authorization tests (ADR-0060).** Each Server Action and Route Handler
  needs a test marked `// AUTHZ: <name> UNAUTHORIZED` right above it; each mutation function also
  one marked `FORBIDDEN` (it can name another person's thing) or `SELF` (only the caller's rows
  change, checked with an author who is not the caller). An entry meant for people without a
  session goes in section 6 of `docs/architecture/threat-model.md` with its reason instead.
  A page that needs a login refuses at the data access layer too, not only in `proxy.ts`.
- `process.env` is read only in `src/shared/config/env.ts`, and `env` is imported only from
  `@/shared/config/index.server` (ADR-0059): through `@/shared/config` it shipped the validator
  (zod) to every browser.
- **Keep the first JavaScript under 200KB gzip (ADR-0059, `e2e/performance.spec.ts`).** Menus,
  closed dialogs, hover cards and toasts go through `@/shared/ui/dropdown-menu`, `dialog`, `toast`
  (loaded on first use), never `@/shared/ui/kit` or Base UI directly from a component on screen at
  load. Parsing a post (twitter-text) lives in `@/shared/lib/text-parse`; the browser loads it with
  `import()` when needed. If the budget test fails, find what grew with `next analyze`; never
  raise the budget.

## 4. Next.js route files are a thin shell (ADR-0021)

- `app/**/page.tsx`, `layout.tsx`, `default.tsx`, `not-found.tsx` (ADR-0039) may only: read `params` / `searchParams`,
  call a loader from `_pages` (or `_app`), render the synchronous `_pages` component with the
  result, wrap in `<Suspense>`. No conditionals, no formatting, no data shaping.
- **Async Server Components exist only in root `app/`.** Every component under `src/` is
  synchronous, so it is unit-testable and counted in the 100% coverage.
- A loader is a plain async function in `_pages/<page>/api/` — tested against the real
  PostgreSQL like any other `api` function.
- `'use client'` goes on leaf components. A client file never imports `index.server`.
- A client component that keeps an `<input>` / `<textarea>` value (files included) in state reads
  the DOM's value once on mount and takes it in: what was entered before hydration never reaches
  `onChange` (ADR-0044; found three times, #47 and #25). Its unit test hydrates server HTML whose
  input already holds a value (`renderToString` → set the value → `hydrateRoot`).

## 5. Enforcement

- `pnpm lint` runs ESLint, `steiger ./src`, and `node scripts/check-src-layers.mjs`; all fail CI.
- Steiger: the recommended `fsd` config, with only `typo-in-layer-name` (for `_app`/`_pages`)
  and `insignificant-slice` turned off (ADR-0030).
- ESLint `no-restricted-imports` blocks: `@/shared/db` outside `api` segments; anything but
  `_pages` / `_app` from root `app/`; `sharp` and `fs` in server code (ADR-0017).
- ESLint `local/no-server-import-in-client` blocks `index.server`, `server-only`, and
  `@/shared/db` in `'use client'` files.
- `scripts/check-src-layers.mjs` fails if `src/` holds anything but the six layers.
- `scripts/check-authz.mjs` (in `pnpm lint`) fails on an entry without its tagged tests, and on a
  threat-model row whose 確かめるテスト does not name an existing test.
- Segment names describe purpose (`entrypoint`, not `providers`); no folder named `ui` inside a segment.
- Do not turn off a Steiger or ESLint rule to make a violation pass. If a rule is wrong for
  this project, disable that one rule in the config with a one-line reason and record it in
  an ADR.
- A PBI names the slices it touches. Creating a new layer-level folder or a new `shared`
  segment is a structural decision: ADR first.
