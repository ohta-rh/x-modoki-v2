import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Coverage is 100% for everything Vitest can run (ADR-0021). The only exclusions are the four
// kinds named in ADR-0021 / ADR-0022: root app/ page, layout, default, not-found, error and global-error files (not in `include`; ADR-0039, ADR-0062),
// vendored shadcn/ui, the Drizzle schema declarations, and type-only files (no code to measure).
// Tests and the database global setup read DATABASE_URL from .env.local, as Next.js does.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: { 'server-only': fileURLToPath(new URL('./test/server-only.ts', import.meta.url)) },
  },
  test: {
    environment: 'node',
    // Return the real text for ?raw imports of the stylesheet (src/_app/styles/tokens.test.ts).
    css: { include: [/global\.css/] },
    setupFiles: ['./test/setup.ts'],
    globalSetup: ['./test/global-setup.ts'],
    include: [
      'src/**/*.test.{ts,tsx}',
      'app/**/*.test.ts',
      'proxy.test.ts',
      'scripts/**/*.test.{ts,mjs}',
      'eslint-rules/**/*.test.mjs',
      'test/**/*.test.ts',
    ],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      include: [
        'src/**/*.{ts,tsx}',
        'app/**/route.ts',
        'proxy.ts',
        'scripts/**/*.{ts,mjs}',
        'eslint-rules/**/*.mjs',
      ],
      exclude: ['**/*.test.*', 'src/shared/ui/kit/**', 'src/shared/db/schema/**'],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ['text', 'json-summary'],
    },
  },
});
