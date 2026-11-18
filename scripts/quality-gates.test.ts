// The quality gates themselves: the rules kept by configuration, checked against that
// configuration, so weakening one turns this red.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import playwright from '../playwright.config';

describe('品質の確認の設定', () => {
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
    const webkit = playwright.projects!.find((project) => project.name === 'webkit')!;
    expect(webkit.use!.connectOptions).toEqual(
      process.platform === 'darwin'
        ? { wsEndpoint: 'ws://127.0.0.1:3333/', exposeNetwork: '<loopback>' }
        : undefined,
    );
  });
});
