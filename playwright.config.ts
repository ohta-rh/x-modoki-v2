import { defineConfig, devices } from '@playwright/test';

// Browser tests run against the production build (ADR-0024): `pnpm build` first, then this
// starts `pnpm start`. Chromium, Firefox and WebKit; stop at the first failure.
const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  maxFailures: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `pnpm start -p ${port}`,
    // Wait for the port, not a 2xx: a missing page must fail the test, not hang the server start.
    port,
    // Never reuse a server already on the port: a stale build there silently hides changes
    // (found in #15). A busy port fails loudly instead.
    reuseExistingServer: false,
    timeout: 120_000,
    // Every test signs up from the same IP; the 10-per-minute limit is tested in Vitest (ADR-0036).
    env: { AUTH_RATE_LIMIT_PER_MINUTE: '1000' },
  },
});
