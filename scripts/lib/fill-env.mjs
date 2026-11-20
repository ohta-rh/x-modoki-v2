// Fills `KEY=` lines of an env file (used by scripts/setup-local.sh). `KEY=VALUE` fills only an empty
// value, so rerunning setup keeps existing secrets; `KEY:=VALUE` always overwrites (values that must
// follow another system, such as the Garage key). Values are never printed.
import { readFileSync, writeFileSync } from 'node:fs';

const USAGE = 'usage: fill-env.mjs <file> KEY=VALUE|KEY:=VALUE ...';

export function fillEnv(text, values, overwrite = []) {
  const filled = [];
  const lines = text.split('\n').map((line) => {
    const eq = line.indexOf('=');
    const key = eq > 0 ? line.slice(0, eq) : null;
    if (key === null || !Object.hasOwn(values, key)) return line;
    if (eq !== line.length - 1 && !overwrite.includes(key)) return line;
    filled.push(key);
    return `${key}=${values[key]}`;
  });
  return { text: lines.join('\n'), filled };
}

export function main(argv, log = console) {
  const [path, ...pairs] = argv;
  if (!path || pairs.length === 0 || pairs.some((pair) => !pair.includes('='))) {
    log.error(USAGE);
    return 2;
  }
  const values = {};
  const overwrite = [];
  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    const force = pair[eq - 1] === ':';
    const key = pair.slice(0, force ? eq - 1 : eq);
    values[key] = pair.slice(eq + 1);
    if (force) overwrite.push(key);
  }
  const { text, filled } = fillEnv(readFileSync(path, 'utf8'), values, overwrite);
  writeFileSync(path, text);
  log.log(
    filled.length > 0 ? `fill-env: filled ${filled.join(', ')}` : 'fill-env: nothing to fill',
  );
  return 0;
}
