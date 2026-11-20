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
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      // Firefox's content process dies on signal 11 while axe runs beside other browsers; axe reads
      // the DOM and CSS, which Chromium and WebKit check the same (ADR-0055, decided by the user).
      testIgnore: /a11y\.spec\.ts$/,
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // On macOS, concurrent headless WebKit stops getting requestAnimationFrame (#61): run it
        // in the same Linux image as CI (`docker compose up -d webkit`), reaching the app through
        // the test runner's loopback (ADR-0052).
        connectOptions:
          process.platform === 'darwin'
            ? { wsEndpoint: 'ws://127.0.0.1:3333/', exposeNetwork: '<loopback>' }
            : undefined,
      },
    },
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
