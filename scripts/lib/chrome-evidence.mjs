// Captures test-report evidence at exact viewport widths (ADR-0024, ADR-0025).
//
//   node scripts/chrome-evidence.mjs --out <dir> [--widths 1280,768,375] [--height 900] \
//        <name>=<url> [<name>=<url> ...]
//
// For every URL and width it opens a fresh page with that viewport, saves
// <out>/<name>-<width>.jpg, and prints one JSON line with what the browser reported: the real
// innerWidth, whether the page scrolls sideways, console errors/warnings, failed requests.
// Exits 1 if any page did not load, has the wrong width, scrolls sideways, logs a console error,
// or has a failed request; 2 on bad arguments. Locally it drives the installed Google Chrome;
// in CI the Chromium bundled with Playwright. It complements — never replaces — looking at the
// page yourself (.claude/rules/definition-of-done.md).

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const USAGE =
  'usage: chrome-evidence.mjs --out <dir> [--widths a,b,c] [--height h] <name>=<url> ...';

export function parseArgs(argv) {
  const options = { widths: [1280, 768, 375], height: 900, out: null, targets: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') options.out = argv[(i += 1)];
    else if (arg === '--widths') options.widths = argv[(i += 1)].split(',').map(Number);
    else if (arg === '--height') options.height = Number(argv[(i += 1)]);
    else if (arg.includes('=')) {
      const at = arg.indexOf('=');
      options.targets.push({ name: arg.slice(0, at), url: arg.slice(at + 1) });
    } else throw new Error(`unknown argument: ${arg}`);
  }
  if (!options.out || options.targets.length === 0) throw new Error(USAGE);
  return options;
}

/** True when the record must fail the run. */
export function judge(record, width) {
  return (
    !record.loaded ||
    record.innerWidth !== width ||
    record.scrollsSideways ||
    record.consoleErrors.length > 0 ||
    record.failedRequests.length > 0
  );
}

export async function capture(browser, target, width, height, outDir) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  const consoleWarnings = [];
  const failedRequests = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 200));
    else if (message.type() === 'warning') consoleWarnings.push(message.text().slice(0, 200));
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message.slice(0, 200)));
  page.on('requestfailed', (request) =>
    failedRequests.push(`${request.failure().errorText} ${request.url().slice(0, 120)}`),
  );
  page.on('response', (response) => {
    if (response.status() >= 400)
      failedRequests.push(`${response.status()} ${response.url().slice(0, 120)}`);
  });

  let loaded = true;
  try {
    await page.goto(target.url, { waitUntil: 'load', timeout: 20_000 });
  } catch {
    loaded = false;
  }
  await page.waitForTimeout(1_000); // let client-side rendering settle
  // A string, not a function: the expression runs in the page, so a function here would count as
  // never called in Node's coverage.
  const metrics = await page.evaluate(
    '({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, title: document.title })',
  );
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `${target.name}-${width}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 60 });
  await context.close();

  return {
    name: target.name,
    url: target.url,
    requestedWidth: width,
    innerWidth: metrics.innerWidth,
    scrollsSideways: metrics.scrollWidth > metrics.innerWidth,
    loaded,
    title: metrics.title.slice(0, 80),
    consoleErrors,
    consoleWarnings,
    failedRequests,
    file,
  };
}

const defaultLaunch = () => chromium.launch(process.env.CI ? {} : { channel: 'chrome' });

export async function run(argv, { log = console, launch = defaultLaunch } = {}) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    log.error(error.message);
    return 2;
  }
  const browser = await launch();
  let failed = false;
  try {
    for (const target of options.targets) {
      for (const width of options.widths) {
        const record = await capture(browser, target, width, options.height, options.out);
        log.log(JSON.stringify(record));
        if (judge(record, width)) failed = true;
      }
    }
  } finally {
    await browser.close();
  }
  return failed ? 1 : 0;
}
