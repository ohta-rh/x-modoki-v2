import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Coverage is 100% for everything Vitest can run (ADR-0021). The only exclusions are the four
// kinds named in ADR-0021 / ADR-0022: root app/ page, layout and default files (not in `include`),
// vendored shadcn/ui, the Drizzle schema declarations, and type-only files (no code to measure).
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: { 'server-only': fileURLToPath(new URL('./test/server-only.ts', import.meta.url)) },
  },
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: [
      'src/**/*.test.{ts,tsx}',
      'app/**/*.test.ts',
      'proxy.test.ts',
      'scripts/**/*.test.{ts,mjs}',
      'eslint-rules/**/*.test.mjs',
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
