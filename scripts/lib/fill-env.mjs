// Fills empty `KEY=` lines of an env file (used by scripts/setup-local.sh). A key that already has a
// value is never overwritten, so rerunning setup keeps existing secrets. Values are never printed.
import { readFileSync, writeFileSync } from 'node:fs';

const USAGE = 'usage: fill-env.mjs <file> KEY=VALUE ...';

export function fillEnv(text, values) {
  const filled = [];
  const lines = text.split('\n').map((line) => {
    const key = line.endsWith('=') ? line.slice(0, -1) : null;
    if (key !== null && Object.hasOwn(values, key)) {
      filled.push(key);
      return `${key}=${values[key]}`;
    }
    return line;
  });
  return { text: lines.join('\n'), filled };
}

export function main(argv, log = console) {
  const [path, ...pairs] = argv;
  if (!path || pairs.length === 0 || pairs.some((pair) => !pair.includes('='))) {
    log.error(USAGE);
    return 2;
  }
  const values = Object.fromEntries(
    pairs.map((pair) => [pair.slice(0, pair.indexOf('=')), pair.slice(pair.indexOf('=') + 1)]),
  );
  const { text, filled } = fillEnv(readFileSync(path, 'utf8'), values);
  writeFileSync(path, text);
  log.log(
    filled.length > 0 ? `fill-env: filled ${filled.join(', ')}` : 'fill-env: nothing to fill',
  );
  return 0;
}
