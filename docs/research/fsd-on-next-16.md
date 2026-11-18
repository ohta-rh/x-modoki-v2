---
type: Research
title: "FSD の構成を Next.js 16.4 で動かした結果"
description: "ルートの `app/` と `src/` の 6 つの層の構成で、Next.js 16.4.6 のビルド・`proxy.ts`・TanStack Query の `initialData`・Steiger・ESLint・Vitest のカバレッジが設計どおりに働くかを確かめた結果と、動いた設定の全文。"
tags: [fsd, nextjs, lint, testing, spike]
status: stable
---

# FSD の構成を Next.js 16.4 で動かした結果

## 調査日: 2026-11-18

- issue: #12
- 捨てる場所に最小のアプリを作って確かめた（リポジトリには入れていない）
- 結論: **構成は ADR-0022 のまま動く。** ただし Steiger の 2 つの決まりが `_app`・`_pages` の構成に合わず、`src/` の直下を Steiger が見ないことが分かった。守らせ方を [ADR-0030](../adr/0030-fsd-lint-exceptions-and-own-layer-check.md) で置き換えた

## 1. 使った版

| パッケージ | 版 |
|---|---|
| `next` | 16.4.6 |
| `typescript` | 6.0.3 |
| `@tanstack/react-query` | 5.108.0 |
| `steiger` / `@feature-sliced/steiger-plugin` | 0.10.0 / 0.8.2 |
| `eslint` / `eslint-config-next` | 10.15.0 / 16.4.6 |
| `vitest` / `@vitest/coverage-v8` | 5.1.0 / 5.1.0 |
| `@vitejs/plugin-react` / `vite-tsconfig-paths` / `jsdom` | 6.3.0 / 6.1.1 / 31.0.1 |
| `@testing-library/react` / `@testing-library/dom` | 16.3.3 / 10.4.2 |

## 2. 確かめたこと

| # | 確かめたこと | 結果 |
|---|---|---|
| 1 | ルートに `app/` と `proxy.ts`、`src/` に層、`@/` が `src/` の構成で `next build` が通る | 通った。`/home` は Partial Prerender |
| 2 | `tsc --noEmit`（TypeScript 6.0.3） | 0 件 |
| 3 | ルートの `proxy.ts` が動く | `/` → 307 → `/home` |
| 4 | `page.tsx` が `_pages` の `load…Page()` で 1 ページ目を取り、`initialData` で `useInfiniteQuery` に渡す | 動いた。Chrome で 20 件 → 「続きを読む」で 40 件 → 45 件で、ボタンが消えた。コンソールのエラー 0、サーバーのログのエラー 0 |
| 5 | Steiger が、正しい構成で 0 で終わる | 2 つの決まりを止めたあと 0（3.1・3.2） |
| 6 | Steiger が、上の層を読む違反で落ちる | 落ちた（`fsd/forbidden-imports`） |
| 7 | Steiger が、公開 API を通らない読み込みで落ちる | 落ちた（`fsd/no-public-api-sidestep`） |
| 8 | Steiger が、`src/` の直下の余計なフォルダで落ちる | **落ちない**（3.3） |
| 9 | ESLint が、`api` セグメントの外からの `@/shared/db` で落ちる | 落ちた（`no-restricted-imports`） |
| 10 | ESLint が、`'use client'` のファイルからの `index.server` で落ちる | ローカルの決まり `local/no-server-import-in-client` で落ちた（3.4） |
| 11 | ESLint が、ルートの `app/` からの `@/widgets` で落ちる | 落ちた（`no-restricted-imports`） |
| 12 | ESLint が、`sharp` で落ちる | 落ちた（`no-restricted-imports`） |
| 13 | Vitest の V8 のカバレッジが、テストの無いファイルを 0% として数え、しきい値で落ちる | 落ちた。`proxy.ts`・`timeline.ts`・`query-provider.tsx` など 6 つが 0% で並び、4 つのしきい値の全部で `ERROR`、終了コード 1 |

## 3. 当たった問題と直し方

### 3.1 Steiger が `_app`・`_pages` を打ち間違いとして落とす

`fsd/typo-in-layer-name` が「Layer "_app" potentially contains a typo. Did you mean "app"?」と落とした。Steiger の土台（`@feature-sliced/filesystem`）は先頭のアンダースコアを層として扱っており、落とすのはこの決まりだけ。

**直し方**: `steiger.config.ts` で、`./src/_app/**` と `./src/_pages/**` だけ、この決まりを止める。

### 3.2 `insignificant-slice` が、1 つのスライスからしか使われないスライスを落とす

`widgets/timeline-feed` が「only one reference in slice "pages/home"」で落ちた。PBI を 1 つずつ足していく間は、ほとんどのスライスがこれに当たる。

**直し方**: この決まりを止める。

### 3.3 Steiger は `src/` の直下を見ない

`src/components/x.ts` を置いても、`src/entites`（打ち間違い）を置いても、Steiger は 0 で終わった。推奨の設定のままでも同じだった。

**直し方**: `src/` の直下に 6 つの層のほかが無いことを、`scripts/check-src-layers.mjs` で確かめる（#15 で、テストつきで作る）。

### 3.4 `no-restricted-imports` は `'use client'` のファイルを見分けられない

ESLint の `no-restricted-imports` は、ファイルのパスでしか決まりを分けられない。

**直し方**: ESLint のローカルの決まり（`eslint-rules/index.mjs`）を書いた。ファイルの先頭の指示に `'use client'` があれば、`index.server`・`server-only`・`@/shared/db` の読み込みを落とす。

### 3.5 `_app` のセグメントの名前

`_app/providers/ui/query-provider.tsx` は、`fsd/segments-by-purpose`（`providers` は中身の種類の名前）と `fsd/no-reserved-folder-names`（セグメントの中の `ui`）で落ちた。`_app/entrypoint/query-provider.tsx` に置き直して通った。

### 3.6 Vitest から `server-only` を読むと落ちる

`server-only` は、React のサーバーの条件の外で読むと例外を投げる。Vitest はその外で動く。

**直し方**: `vitest.config.ts` で、`server-only` を空のモジュール（`test/server-only.ts`、`src/` の外）に向ける。

### 3.7 pnpm 12 の、出たばかりの版を入れない仕組み

pnpm 12 は、公開されてから日の浅い版を入れるときに、`pnpm-workspace.yaml` に `minimumReleaseAgeExclude` を自分で書き足した（`@tanstack/react-query@5.108.0`、公開の翌日）。供給網を守る仕組みなので、骨組み（#15）では除外を足さず、公開から 7 日以上たった版に固定する。

## 4. 動いた設定の全文

### `next.config.ts`

```ts
import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
};
export default nextConfig;
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "skipLibCheck": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`baseUrl` は書かない（TypeScript 7 でエラーになる。ADR-0005）。

### `steiger.config.ts`

```ts
import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Next.js reserves app/ and pages/, so the FSD guide renames the layers to _app/_pages
    // (ADR-0022). Steiger's traversal understands the prefix; only this rule reads it as a typo.
    files: ['./src/_app/**', './src/_pages/**'],
    rules: { 'fsd/typo-in-layer-name': 'off' },
  },
  {
    // A slice used by one other slice is normal while features land one PBI at a time.
    rules: { 'fsd/insignificant-slice': 'off' },
  },
]);
```

### `eslint.config.mjs`

```js
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import local from './eslint-rules/index.mjs';

// Server code must run on Cloudflare Workers (ADR-0017).
const RUNTIME = [
  { name: 'sharp', message: 'Native modules do not run on Cloudflare Workers (ADR-0017, ADR-0018).' },
  { name: 'fs', message: 'No filesystem access in application code (ADR-0017).' },
  { name: 'node:fs', message: 'No filesystem access in application code (ADR-0017).' },
  { name: 'fs/promises', message: 'No filesystem access in application code (ADR-0017).' },
  { name: 'node:fs/promises', message: 'No filesystem access in application code (ADR-0017).' },
];
// Database access lives only in api segments (ADR-0022).
const DB = {
  group: ['@/shared/db', '@/shared/db/*'],
  message: 'Only api segments, src/shared/db and src/shared/auth may import the database (ADR-0022).',
};
// The root app/ directory is routing only (ADR-0022).
const ROUTING_ONLY = {
  group: ['@/widgets', '@/widgets/*', '@/features', '@/features/*', '@/entities', '@/entities/*', '@/shared', '@/shared/*'],
  message: 'app/ may import only from @/_pages and @/_app (ADR-0022).',
};

const config = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts']),
  {
    plugins: { local },
    rules: { 'local/no-server-import-in-client': 'error' },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'proxy.ts'],
    rules: { 'no-restricted-imports': ['error', { paths: RUNTIME, patterns: [DB] }] },
  },
  {
    files: ['src/**/api/**/*.{ts,tsx}', 'src/shared/db/**/*.{ts,tsx}', 'src/shared/auth/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { paths: RUNTIME }] },
  },
  {
    files: ['app/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { paths: RUNTIME, patterns: [DB, ROUTING_ONLY] }] },
  },
]);

export default config;
```

`export default` の前に変数へ入れる（`import/no-anonymous-default-export` の警告を避ける）。

### `eslint-rules/index.mjs`

```js
/** Local ESLint rules for x-modoki (ADR-0022, ADR-0030). */
const SERVER_ONLY = [/(^|\/)index\.server$/, /^server-only$/, /^@\/shared\/db(\/|$)/];

function isClientModule(program) {
  for (const node of program.body) {
    if (node.type !== 'ExpressionStatement' || typeof node.directive !== 'string') return false;
    if (node.directive === 'use client') return true;
  }
  return false;
}

const noServerImportInClient = {
  meta: {
    type: 'problem',
    schema: [],
    messages: { server: "A 'use client' module must not import the server-only module \"{{source}}\"." },
  },
  create(context) {
    if (!isClientModule(context.sourceCode.ast)) return {};
    const check = (node) => {
      const source = node.source?.value;
      if (typeof source === 'string' && SERVER_ONLY.some((re) => re.test(source))) {
        context.report({ node, messageId: 'server', data: { source } });
      }
    };
    return { ImportDeclaration: check, ExportNamedDeclaration: check, ExportAllDeclaration: check };
  },
};

const plugin = { rules: { 'no-server-import-in-client': noServerImportInClient } };
export default plugin;
```

### `vitest.config.ts`

```ts
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: { alias: { 'server-only': fileURLToPath(new URL('./test/server-only.ts', import.meta.url)) } },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'app/**/route.ts', 'proxy.ts'],
      exclude: ['**/*.test.{ts,tsx}'],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ['text'],
    },
  },
});
```

`test/server-only.ts` は `export {};` だけ。コンポーネントのテストは、ファイルの先頭に `// @vitest-environment jsdom` を書いて jsdom で動かした。

### `pnpm-workspace.yaml`

```yaml
allowBuilds:
  esbuild: true
  unrs-resolver: true
```

### ルートの `app/` と `_pages` のつなぎ方

```tsx
// app/(main)/home/page.tsx
import { Suspense } from 'react';
import { HomePage, HomePageSkeleton } from '@/_pages/home';
import { loadHomePage } from '@/_pages/home/index.server';

async function Content() {
  return <HomePage {...(await loadHomePage())} />;
}

export default function Page() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <Content />
    </Suspense>
  );
}
```

```ts
// app/api/timeline/route.ts
export { getTimeline as GET } from '@/_app/api-routes';
```

```tsx
// src/widgets/timeline-feed/ui/timeline-feed.tsx（抜粋）
'use client';
const query = useInfiniteQuery({
  queryKey: ['timeline'],
  queryFn: ({ pageParam }) => fetchPage(pageParam as string),
  initialPageParam: '',
  getNextPageParam: (last) => last.nextCursor ?? undefined,
  initialData: { pages: [firstPage], pageParams: [''] },
});
```

`loadHomePage()` は、データを読む前に `await connection()` を呼ぶ（[Better Auth の調査](better-auth-on-next-16.md) の 3.2 と同じ理由）。

## 5. 実装（#15）への申し送り

- 上の設定を、そのまま使う。`pnpm lint` は ESLint・Steiger・`scripts/check-src-layers.mjs` の 3 つ
- `scripts/check-src-layers.mjs` とローカルの ESLint の決まりには、テストを先に書く（ADR-0026）
- 再書き出しだけのファイル（`app/api/**/route.ts`）は、V8 のカバレッジの表に出ない（実行する文が無い）
- `@tanstack/react-query` は、公開から 7 日以上たった版に固定する（3.7）

## 未検証事項

- Playwright を 3 つのブラウザで動かすこと（#15 で確かめる）
- Steiger の止めた決まりが、次の版で直るか

## 参考リンク

- [Feature-Sliced Design: Usage with Next.js](https://feature-sliced.design/docs/guides/tech/with-nextjs)
- [Steiger](https://github.com/feature-sliced/steiger)
- Next.js の同梱の文書: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md`
