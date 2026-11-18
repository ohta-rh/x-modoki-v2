import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import local from './eslint-rules/index.mjs';

// FSD and runtime constraints: ADR-0017, ADR-0022, ADR-0030.

// Server code must run on Cloudflare Workers (ADR-0017).
const RUNTIME = [
  {
    name: 'sharp',
    message: 'Native modules do not run on Cloudflare Workers (ADR-0017, ADR-0018).',
  },
  { name: 'fs', message: 'No filesystem access in application code (ADR-0017).' },
  { name: 'node:fs', message: 'No filesystem access in application code (ADR-0017).' },
  { name: 'fs/promises', message: 'No filesystem access in application code (ADR-0017).' },
  { name: 'node:fs/promises', message: 'No filesystem access in application code (ADR-0017).' },
];
// Database access lives only in api segments (ADR-0022).
const DB = {
  group: ['@/shared/db', '@/shared/db/*'],
  message:
    'Only api segments, src/shared/db and src/shared/auth may import the database (ADR-0022).',
};
// The root app/ directory is routing only (ADR-0022).
const ROUTING_ONLY = {
  group: [
    '@/widgets',
    '@/widgets/*',
    '@/features',
    '@/features/*',
    '@/entities',
    '@/entities/*',
    '@/shared',
    '@/shared/*',
  ],
  message: 'app/ may import only from @/_pages and @/_app (ADR-0022).',
};

const config = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'test-results/**',
    'playwright-report/**',
    'next-env.d.ts',
  ]),
  {
    plugins: { local },
    rules: { 'local/no-server-import-in-client': 'error' },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'proxy.ts'],
    rules: { 'no-restricted-imports': ['error', { paths: RUNTIME, patterns: [DB] }] },
  },
  {
    files: [
      'src/**/api/**/*.{ts,tsx}',
      'src/shared/db/**/*.{ts,tsx}',
      'src/shared/auth/**/*.{ts,tsx}',
    ],
    rules: { 'no-restricted-imports': ['error', { paths: RUNTIME }] },
  },
  {
    files: ['app/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { paths: RUNTIME, patterns: [DB, ROUTING_ONLY] }] },
  },
]);

export default config;
