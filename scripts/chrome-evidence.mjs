#!/usr/bin/env node
// Captures test-report evidence from real Chrome at exact viewport widths (ADR-0024, ADR-0025).
//
//   node scripts/chrome-evidence.mjs --out <dir> [--widths 1280,768,375] [--height 900] \
//        <name>=<url> [<name>=<url> ...]
//
// For every URL and width it sets the viewport through the DevTools protocol (a headless
// window cannot be narrower than ~500px, so --window-size alone silently crops), saves
// <out>/<name>-<width>.jpg, and prints one JSON line with what Chrome reported: the real
// innerWidth, whether the page scrolls sideways, console errors/warnings, failed requests.
// Exits 1 if any page scrolls sideways, logs a console error, or has a failed request.
//
// This complements — never replaces — looking at the page yourself
// (.claude/rules/definition-of-done.md). No dependencies; needs Node >= 22 and Google Chrome.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

function parseArgs(argv) {
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
  if (!options.out || options.targets.length === 0) {
    throw new Error('usage: chrome-evidence.mjs --out <dir> [--widths a,b,c] <name>=<url> ...');
  }
  return options;
}

/** A minimal DevTools-protocol client over the page's WebSocket. */
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const pending = new Map();
    const listeners = [];
    let nextId = 0;
    socket.addEventListener('error', () => reject(new Error(`cannot connect to ${wsUrl}`)));
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { done, fail } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) fail(new Error(message.error.message));
        else done(message.result);
      } else if (message.method) {
        for (const listener of listeners) listener(message);
      }
    });
    socket.addEventListener('open', () =>
      resolve({
        send(method, params = {}) {
          nextId += 1;
          const id = nextId;
          return new Promise((done, fail) => {
            pending.set(id, { done, fail });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
        on(listener) {
          listeners.push(listener);
        },
        close() {
          socket.close();
        },
      }),
    );
  });
}

async function waitForDebugger(port) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome is still starting.
    }
    await sleep(200);
  }
  throw new Error('Chrome did not open its debugging port');
}

async function capture(port, target, width, height, outDir) {
  const created = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  const page = await created.json();
  const client = await connect(page.webSocketDebuggerUrl);
  const consoleErrors = [];
  const consoleWarnings = [];
  const failedRequests = [];
  let loaded = false;

  client.on((message) => {
    if (message.method === 'Runtime.consoleAPICalled') {
      const text = message.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
      if (message.params.type === 'error') consoleErrors.push(text.slice(0, 200));
      if (message.params.type === 'warning') consoleWarnings.push(text.slice(0, 200));
    } else if (message.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(String(message.params.exceptionDetails.text).slice(0, 200));
    } else if (message.method === 'Network.loadingFailed' && !message.params.canceled) {
      failedRequests.push(message.params.errorText);
    } else if (message.method === 'Network.responseReceived') {
      const { status, url } = message.params.response;
      if (status >= 400) failedRequests.push(`${status} ${url.slice(0, 120)}`);
    } else if (message.method === 'Page.loadEventFired') {
      loaded = true;
    }
  });

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });
  await client.send('Page.navigate', { url: target.url });
  for (let waited = 0; waited < 20_000 && !loaded; waited += 200) await sleep(200);
  await sleep(1500); // let client-side rendering settle

  const { result } = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      title: document.title,
    })`,
  });
  const metrics = result.value;
  const shot = await client.send('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
  const file = join(outDir, `${target.name}-${width}.jpg`);
  writeFileSync(file, Buffer.from(shot.data, 'base64'));

  client.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${page.id}`);

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

const options = parseArgs(process.argv.slice(2));
const chrome = CHROME_CANDIDATES.find((path) => existsSync(path));
if (!chrome) {
  console.error('Google Chrome was not found; set CHROME_PATH');
  process.exit(1);
}
mkdirSync(options.out, { recursive: true });

const profile = mkdtempSync(join(tmpdir(), 'chrome-evidence-'));
const port = 9300 + Math.floor(process.pid % 500);
const browser = spawn(
  chrome,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--hide-scrollbars',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

let failed = false;
try {
  await waitForDebugger(port);
  for (const target of options.targets) {
    for (const width of options.widths) {
      const record = await capture(port, target, width, options.height, options.out);
      console.log(JSON.stringify(record));
      if (
        !record.loaded ||
        record.innerWidth !== width ||
        record.scrollsSideways ||
        record.consoleErrors.length > 0 ||
        record.failedRequests.length > 0
      ) {
        failed = true;
      }
    }
  }
} finally {
  browser.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
