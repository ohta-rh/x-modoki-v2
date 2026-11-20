// The authorization check (#33, ADR-0060): every Server Action, mutation function and Route Handler
// has a test tagged for refusing a caller without a session, and every mutation function one for
// refusing another person's data (FORBIDDEN) or for touching only the caller's own rows (SELF).
// Entries meant for people without a session are listed, with the reason, in the threat model.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const THREAT_MODEL = 'docs/architecture/threat-model.md';
const PUBLIC_HEADING = /^##\s.*ログインの要らない入口/;
const TAG = /^\s*\/\/ AUTHZ: (\w+) (UNAUTHORIZED|FORBIDDEN|SELF)\s*$/;
const TEST_CALL = /^\s*(it|test)(\.\w+)*\(/;
const TEST_FILE = /\.(test\.(ts|tsx|mjs)|spec\.ts)$/;

/** Files under `dir` (recursively) whose names match `pattern`, as paths relative to `root`. */
function files(root, dir, pattern) {
  const start = join(root, dir);
  if (!existsSync(start)) return [];
  return readdirSync(start, { recursive: true })
    .map(String)
    .filter((name) => pattern.test(name))
    .map((name) => relative(root, join(start, name)))
    .sort();
}

const exportsOf = (text) =>
  [...text.matchAll(/^export (?:async )?function (\w+)|^export const (\w+)\s*=/gm)].map(
    (match) => match[1] ?? match[2],
  );

/** Every entry: its name, its file, and the tags it needs. */
function entries(root) {
  const source = (path) => !TEST_FILE.test(path) && !path.endsWith('/index.ts');
  const features = files(root, 'src/features', /\/api\/[^/]+\.ts$/).filter(source);
  const routes = files(root, 'src/_app/api-routes', /^[^/]+\.ts$/).filter(source);
  const found = [];
  for (const path of [...features, ...routes]) {
    const mutation = path.startsWith('src/features/') && !path.endsWith('/actions.ts');
    for (const name of exportsOf(readFileSync(join(root, path), 'utf8'))) {
      found.push({ name, path, needs: mutation ? ['UNAUTHORIZED', 'OWNER'] : ['UNAUTHORIZED'] });
    }
  }
  return found;
}

/** The public entries in the threat model: name → reason. */
function publicEntries(root) {
  const lines = readFileSync(join(root, THREAT_MODEL), 'utf8').split('\n');
  const start = lines.findIndex((line) => PUBLIC_HEADING.test(line));
  const listed = [];
  if (start < 0) return listed;
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break;
    const cells = /^\|\s*`(\w+)`\s*\|(.*)\|\s*$/.exec(line);
    if (cells) listed.push({ name: cells[1], reason: cells[2].trim() });
  }
  return listed;
}

const titled = (text, name) =>
  new RegExp(
    `(it|test)(\\.\\w+)*\\(\\s*['"\`]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`,
  ).test(text);

/** Each threat row's 確かめるテスト cell: `path` › name, joined by 、; — for an accepted threat. */
function threatErrors(root) {
  const errors = [];
  for (const line of readFileSync(join(root, THREAT_MODEL), 'utf8').split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    if (!/^T-\d+$/.test(cells[1] ?? '')) continue;
    const [id, cell] = [cells[1], cells[7]];
    if (cell === '—') continue;
    const refs = [...cell.matchAll(/`([^`]+)` › (.+?)(?=、`|$)/g)];
    if (refs.length === 0) errors.push(`${id}: names no test (\`path\` › test name)`);
    for (const [, path, name] of refs) {
      if (!existsSync(join(root, path))) errors.push(`${id}: ${path} does not exist`);
      else if (!titled(readFileSync(join(root, path), 'utf8'), name)) {
        errors.push(`${id}: ${path} has no test named "${name}"`);
      }
    }
  }
  return errors;
}

/** Tags written directly above a test: name → kinds, and errors for unknown names. */
function tags(root, known) {
  const kinds = new Map();
  const errors = [];
  const tests = ['src', 'app', 'test', 'e2e', 'scripts'].flatMap((dir) =>
    files(root, dir, TEST_FILE),
  );
  for (const path of tests) {
    const lines = readFileSync(join(root, path), 'utf8').split('\n');
    lines.forEach((line, index) => {
      const tag = TAG.exec(line);
      if (!tag) return;
      if (!known.has(tag[1])) {
        errors.push(`${path}: AUTHZ tag names ${tag[1]}, which is not an entry`);
        return;
      }
      // Tags may stack: they all belong to the test right below the last of them.
      let next = index + 1;
      while (TAG.test(lines[next] ?? '')) next += 1;
      if (!TEST_CALL.test(lines[next])) return;
      kinds.set(tag[1], new Set([...(kinds.get(tag[1]) ?? []), tag[2]]));
    });
  }
  return { kinds, errors };
}

/** The problems found, in a stable order; empty when every entry is covered. */
export function checkAuthz(root) {
  const all = entries(root);
  const known = new Set(all.map((entry) => entry.name));
  const listed = publicEntries(root);
  const open = new Set(listed.map((entry) => entry.name));
  const { kinds, errors: tagErrors } = tags(root, known);
  const errors = [];
  for (const { name, path, needs } of all) {
    if (open.has(name)) continue;
    const has = kinds.get(name) ?? new Set();
    if (needs.includes('UNAUTHORIZED') && !has.has('UNAUTHORIZED')) {
      errors.push(`${name} (${path}): no test tagged UNAUTHORIZED`);
    }
    if (needs.includes('OWNER') && !has.has('FORBIDDEN') && !has.has('SELF')) {
      errors.push(`${name} (${path}): no test tagged FORBIDDEN or SELF`);
    }
  }
  for (const { name, reason } of listed) {
    if (!known.has(name))
      errors.push(`${name}: listed as public in ${THREAT_MODEL} but not an entry`);
    else if (reason === '')
      errors.push(`${name}: listed as public in ${THREAT_MODEL} without a reason`);
  }
  return [...errors, ...tagErrors, ...threatErrors(root)];
}

/** `--root <dir>`: prints the problems; 1 if there are any. */
export function main(argv, log = console) {
  const at = argv.indexOf('--root');
  const root = at < 0 ? process.cwd() : argv[at + 1];
  const errors = checkAuthz(root);
  if (errors.length > 0) {
    log.error(`authz check failed: ${errors.length} problem(s)`);
    for (const error of errors) log.error(`  ${error}`);
    return 1;
  }
  const all = entries(root);
  const open = new Set(publicEntries(root).map((entry) => entry.name));
  const checked = all.filter((entry) => !open.has(entry.name)).length;
  log.log(`authz check passed: ${checked} entries, ${all.length - checked} public`);
  return 0;
}
