// The speed budget (#32, NFR-PERF-01 to 03) and reading it out of a Lighthouse result.

/** LCP and TBT in milliseconds; CLS unitless. A value equal to its budget is within it. */
export const BUDGET = { lcp: 2500, cls: 0.1, tbt: 200 };

/** The names of the metrics over budget, in budget order. */
export function overBudget(metrics) {
  return Object.keys(BUDGET).filter((name) => metrics[name] > BUDGET[name]);
}

/** LCP, CLS and TBT from a Lighthouse result (its `lhr`). */
export function readMetrics(lhr) {
  const value = (id) => lhr.audits[id].numericValue;
  return {
    lcp: value('largest-contentful-paint'),
    cls: value('cumulative-layout-shift'),
    tbt: value('total-blocking-time'),
  };
}

/** Each metric's middle value over an odd number of runs. */
export function median(runs) {
  const middle = (name) =>
    runs.map((run) => run[name]).sort((a, b) => a - b)[(runs.length - 1) / 2];
  return { lcp: middle('lcp'), cls: middle('cls'), tbt: middle('tbt') };
}

/** Runs per page: applied throttling varies from run to run, so the middle of three counts. */
export const RUNS = 3;

/** A free TCP port on this machine, for Chromium's remote debugging. */
async function freePort() {
  const { createServer } = await import('node:net');
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

/**
 * Lighthouse's mobile run of `url` in Playwright's Chromium (the bundled one, so CI's image has it),
 * sending `cookie` with every request so a signed-in page is measured signed in. The mobile network
 * and CPU are applied, not simulated: the simulation counts every script requested before the
 * largest paint as delaying it, but a streamed page reveals its content without them (ADR-0058).
 */
export async function measure(url, { cookie = '' }) {
  const [{ chromium }, { default: lighthouse }] = await Promise.all([
    import('@playwright/test'),
    import('lighthouse'),
  ]);
  const port = await freePort();
  const browser = await chromium.launch({ args: [`--remote-debugging-port=${port}`] });
  try {
    const result = await lighthouse(url, {
      port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance'],
      throttlingMethod: 'devtools',
      // An empty Cookie header when signed out: no branch, nothing sent that matters.
      extraHeaders: { Cookie: cookie },
    });
    return readMetrics(result.lhr);
  } finally {
    await browser.close();
  }
}

/** `--base <url> [--cookie <header>] <path>…`: measures each path; 1 if any is over budget. */
export async function main(argv, { measure: run = measure, log = console.log } = {}) {
  const option = (name) => {
    const at = argv.indexOf(name);
    return at < 0 ? undefined : argv[at + 1];
  };
  const base = option('--base');
  const cookie = option('--cookie');
  const paths = argv.filter((arg, i) => !arg.startsWith('--') && !argv[i - 1]?.startsWith('--'));
  let failed = false;
  for (const path of paths) {
    const runs = [];
    for (let i = 0; i < RUNS; i += 1) runs.push(await run(`${base}${path}`, { cookie }));
    const metrics = median(runs);
    const over = overBudget(metrics);
    failed ||= over.length > 0;
    log(
      `${path.padEnd(40)} lcp=${Math.round(metrics.lcp)}ms cls=${Number(metrics.cls.toFixed(3))} tbt=${Math.round(metrics.tbt)}ms  ${over.length ? `over: ${over.join(', ')}` : 'ok'}`,
    );
  }
  return failed ? 1 : 0;
}
