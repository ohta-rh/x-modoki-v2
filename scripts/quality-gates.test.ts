// The quality gates themselves (#30): the requirements that are kept by configuration — coverage,
// CI, lint, the browsers — checked against that configuration, so weakening one turns this red.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import playwright from '../playwright.config';
import { guideCommands } from './lib/guide-commands.mjs';
import vitestConfig from '../vitest.config';

/**
 * The rule ids ESLint reports for `code` at `filePath`, with the project's own config. In a child
 * process: loaded here, the config and its local rules would be counted twice by coverage.
 */
// Each call starts ESLint in its own process: 3-4 seconds on a busy machine, so the tests that use
// it get 30 seconds.
const lintAs = async (filePath: string, code: string) => {
  const run = spawnSync(
    'node_modules/.bin/eslint',
    ['--stdin', '--stdin-filename', filePath, '--format', 'json'],
    { input: code, encoding: 'utf8' },
  );
  const [result] = JSON.parse(run.stdout) as { messages: { ruleId: string }[] }[];
  return result.messages.map((message) => message.ruleId);
};

describe('品質の確認の設定（#30）', () => {
  // NFR-MAINT-01: カバレッジ 100%
  it('カバレッジの閾値は、行・分岐・関数・文の全部で 100%。外せるのは ADR-0021・ADR-0022 の種類だけ', () => {
    const coverage = vitestConfig.test!.coverage as {
      thresholds: Record<string, number>;
      exclude: string[];
    };
    expect(coverage.thresholds).toEqual({
      lines: 100,
      branches: 100,
      functions: 100,
      statements: 100,
    });
    expect(coverage.exclude).toEqual([
      '**/*.test.*',
      'src/shared/ui/kit/**',
      'src/shared/db/schema/**',
    ]);
  });

  // NFR-MAINT-02: CI の 7 つの確認
  it('CI は push と PR のたびに、7 つの確認を順に流す', () => {
    const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(ci).toMatch(/on:\n\s+push:[\s\S]*pull_request:/);
    const order = [
      'pnpm docs:check',
      'pnpm typecheck',
      'pnpm lint',
      'pnpm format:check',
      'pnpm test --coverage',
      'pnpm build',
      'pnpm test:e2e',
    ].map((step) => ci.indexOf(step));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(ci).not.toMatch(/^\s*continue-on-error:/m);
  });

  it('CI は、まっさらなランナーで手順書の「最初の準備」をそのまま流し、シードの人で /home に入る（#35、ADR-0069）', () => {
    const guide = readFileSync('docs/guides/local-development.md', 'utf8');
    const setup = guideCommands(guide, '1. 最初の準備');
    expect(setup).toMatch(/pnpm install[\s\S]*setup-local\.sh[\s\S]*db:migrate[\s\S]*db:seed/);
    expect(guideCommands(guide, '2. 毎日の起動')).toMatch(/pnpm dev/);
    const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
    const job = ci.slice(ci.indexOf('\n  fresh-clone:'));
    expect(job).toMatch(/^\n  fresh-clone:/);
    expect(job).toContain(
      'node scripts/guide-commands.mjs docs/guides/local-development.md "1. 最初の準備"',
    );
    expect(job).toContain(
      'node scripts/guide-commands.mjs docs/guides/local-development.md "2. 毎日の起動"',
    );
    expect(job).toContain('sample01');
    expect(job).not.toMatch(/^\s*continue-on-error:/m);
  });

  it('Dependabot が npm と GitHub Actions を週に 1 回調べ、パッチとマイナーは 1 つの PR、ADR が固定した系列は上げない（#37、ADR-0071）', () => {
    const config = readFileSync('.github/dependabot.yml', 'utf8');
    for (const ecosystem of ['npm', 'github-actions']) {
      expect(config).toMatch(
        new RegExp(
          `package-ecosystem: ${ecosystem}\\n\\s+directory: /\\n\\s+schedule:\\n\\s+interval: weekly`,
        ),
      );
    }
    // One group per ecosystem.
    expect(config.match(/update-types: \[minor, patch\]/g)).toHaveLength(2);
    // Each pinned line names the ADR that pinned it, and ignores what would leave the line.
    const major = "'version-update:semver-major'";
    const minor = "'version-update:semver-minor'";
    for (const [name, adr, types] of [
      ['next', 'ADR-0004', [major, minor]],
      ['react', 'ADR-0004', [major, minor]],
      ['react-dom', 'ADR-0004', [major, minor]],
      ['@types/react', 'ADR-0004', [major, minor]],
      ['@types/react-dom', 'ADR-0004', [major, minor]],
      ['typescript', 'ADR-0005', [major, minor]],
      ['@types/node', 'ADR-0005', [major]],
      ['drizzle-orm', 'ADR-0006', [major, minor]],
      ['drizzle-kit', 'ADR-0006', [major, minor]],
      // The exact version is also the Playwright image's tag in ci.yml and docker-compose.yml.
      ['@playwright/test', 'ADR-0046', []],
      ['playwright', 'ADR-0046', []],
    ] as const) {
      const quoted = name.startsWith('@') ? `'${name}'` : name;
      expect(config, name).toContain(`- dependency-name: ${quoted}\n`);
      // No update types: every update of it is ignored.
      const next = `- dependency-name: ${quoted}\n        update-types: `;
      if (types.length > 0) expect(config, name).toContain(`${next}[${types.join(', ')}]`);
      else expect(config, name).not.toContain(next);
      const at = config.indexOf(`- dependency-name: ${quoted}\n`);
      expect(config.slice(0, at).trimEnd().split('\n').at(-1), name).toMatch(
        new RegExp(`# ${adr}`),
      );
    }
  });

  it('依存の監査は 8 つ目の確認で、ほかの 7 つより先に動く（#37、ADR-0070）', () => {
    const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(ci).toMatch(
      /- name: 8\. Dependency audit[^\n]*\n\s+run: pnpm audit --prod --audit-level high$/m,
    );
    expect(ci.indexOf('- name: 8. Dependency audit')).toBeLessThan(
      ci.indexOf('- name: 1. Documentation'),
    );
  });

  // NFR-SEC-11: 本番の依存に、高と重大の脆弱性が無い
  it('CI は、本番の依存の高と重大の脆弱性を監査し、あれば止まる（#33）', () => {
    const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(ci).toMatch(/^\s*run: pnpm audit --prod --audit-level high$/m);
    expect(ci.indexOf('pnpm audit')).toBeLessThan(ci.indexOf('pnpm docs:check'));
  });

  // NFR-MAINT-03: Steiger と ESLint の違反 0
  it('lint は ESLint（警告も 0）と Steiger と src の層と認可のテストの確かめで、ルートから DB を読むと止まる', async () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.lint).toBe(
      'eslint --max-warnings 0 . && steiger ./src && node scripts/check-src-layers.mjs && node scripts/check-authz.mjs',
    );
    expect(
      await lintAs('app/x/page.tsx', "import { getDb } from '@/shared/db';\nvoid getDb;\n"),
    ).toContain('no-restricted-imports');
  }, 30_000);

  // NFR-MAINT-06: Workers で動かないもの
  it('サーバーのコードで、ネイティブのモジュール（sharp）とファイルシステムを読むと止まる', async () => {
    for (const code of [
      "import sharp from 'sharp';\nvoid sharp;\n",
      "import { writeFileSync } from 'node:fs';\nvoid writeFileSync;\n",
    ]) {
      expect(await lintAs('src/features/x/api/x.ts', code)).toContain('no-restricted-imports');
    }
  }, 30_000);

  it('macOS では、WebKit を CI と同じ Playwright のイメージで動かす（#61）', () => {
    const { devDependencies } = JSON.parse(readFileSync('package.json', 'utf8')) as {
      devDependencies: Record<string, string>;
    };
    const image = `mcr.microsoft.com/playwright:v${devDependencies['@playwright/test']}-noble`;
    expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toContain(image);
    const compose = readFileSync('docker-compose.yml', 'utf8');
    expect(compose).toMatch(new RegExp(`webkit:\\n\\s+image: ${image.replaceAll('.', '\\.')}\\n`));
    expect(compose).toContain(
      `playwright@${devDependencies['@playwright/test']} run-server --port 3333 --host 0.0.0.0`,
    );
    // An init process reaps the WebKit processes each test leaves: without one, 4,683 zombies piled
    // up in a day and new browsers stalled (found in #34).
    expect(compose).toMatch(/webkit:\n(\s+\S.*\n)*?\s+init: true\n/);
    const webkit = playwright.projects!.find((project) => project.name === 'webkit')!;
    expect(webkit.use!.connectOptions).toEqual(
      process.platform === 'darwin'
        ? { wsEndpoint: 'ws://127.0.0.1:3333/', exposeNetwork: '<loopback>' }
        : undefined,
    );
  });

  it('ドキュメントの確認は、要件とテストの結びつきも確かめる（#30、ADR-0053）', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['docs:check']).toBe(
      'node scripts/check-docs.mjs && node scripts/check-traceability.mjs',
    );
  });

  // NFR-COMPAT-01: 3 つのブラウザ
  it('画面のテストは Chromium・Firefox・WebKit の 3 つで流す', () => {
    expect(playwright.projects!.map((project) => project.name)).toEqual([
      'chromium',
      'firefox',
      'webkit',
    ]);
  });
});
