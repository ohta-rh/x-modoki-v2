// Checks that every requirement and every URL is tied to a test that exists (#30).
// - Each FR- / NFR- ID in docs/requirements/{functional,non-functional}.md has a row in
//   docs/requirements/traceability.md naming a test file and a test name; the file exists, has a
//   test of that name, and mentions the ID (so `grep -rn FR-POST-01 src e2e` finds the test).
// - Each URL in section 1 of docs/architecture/routing.md has a row naming a Playwright test
//   (under e2e/) that exists.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** A requirement row: its ID and its last cell, the PBIs that own it. */
const ID = /^\| ((?:FR|NFR)-[A-Z0-9]+-\d+) \|.*\| ([^|]*) \|\s*$/gm;
/** A row a later PBI will fill (ADR-0053): `#31 で確かめる`. */
const LATER = /^#(\d+) で確かめる/;
/** A test cell: `path` › test name. */
const TEST_CELL = /`([^`]+)` › (.+?)\s*$/;

const read = (root, path) => readFileSync(join(root, path), 'utf8');

/** ID → the PBIs that own it, from both requirement tables. */
function requirements(root) {
  return ['functional.md', 'non-functional.md'].flatMap((name) =>
    [...read(root, join('docs/requirements', name)).matchAll(ID)].map((match) => [
      match[1],
      match[2],
    ]),
  );
}

/** The backticked URLs in the first column of routing.md's section 1 table. */
function routes(root) {
  const text = read(root, 'docs/architecture/routing.md');
  const section = text.slice(
    text.indexOf('## 1.'),
    text.indexOf('\n## ', text.indexOf('## 1.') + 1),
  );
  return section
    .split('\n')
    .filter((line) => line.startsWith('| `'))
    .flatMap((line) => [...line.split('|')[1].matchAll(/`([^`]+)`/g)].map((match) => match[1]));
}

/** Rows of a traceability table: first column (without backticks) → the test cell. */
function rows(text, heading) {
  const start = text.indexOf(heading);
  if (start < 0) return new Map();
  const end = text.indexOf('\n## ', start + 1);
  const map = new Map();
  for (const line of text.slice(start, end < 0 ? undefined : end).split('\n')) {
    if (!line.startsWith('| ') || line.startsWith('|---')) continue;
    const cells = line.split('|').map((cell) => cell.trim());
    map.set(cells[1].replaceAll('`', ''), cells.at(-2));
  }
  return map;
}

function checkTest(root, key, cell, { mention, e2e }) {
  const match = cell && TEST_CELL.exec(cell);
  if (!match) return [`${key}: no test`];
  const [, path, name] = match;
  if (!existsSync(join(root, path))) return [`${key}: ${path} does not exist`];
  const source = read(root, path);
  const errors = [];
  if (e2e && !path.startsWith('e2e/')) errors.push(`${key}: ${path} is not a Playwright test`);
  if (!source.includes(`'${name}'`) && !source.includes(`\`${name}\``)) {
    errors.push(`${key}: ${path} has no test named "${name}"`);
  }
  if (mention && !source.includes(key)) errors.push(`${key}: ${path} does not mention ${key}`);
  return errors;
}

export function checkTraceability(root) {
  const path = 'docs/requirements/traceability.md';
  if (!existsSync(join(root, path))) return [`${path} does not exist`];
  const text = read(root, path);
  const rowsOf = rows(text, '## 要件');
  const urls = rows(text, '## URL');
  return [
    ...requirements(root).flatMap(([id, owners]) => {
      const later = LATER.exec(rowsOf.get(id) ?? '');
      if (later)
        return owners.includes(`#${later[1]}`) ? [] : [`${id}: #${later[1]} does not own it`];
      return checkTest(root, id, rowsOf.get(id), { mention: true, e2e: false });
    }),
    ...routes(root).flatMap((url) =>
      checkTest(root, url, urls.get(url), { mention: false, e2e: true }),
    ),
  ];
}

/** `--root <repository>` is required: scripts/check-traceability.mjs passes it. */
export function main(argv, log = console) {
  const root = argv[argv.indexOf('--root') + 1];
  const errors = checkTraceability(root);
  if (errors.length === 0) {
    log.log('traceability check passed');
    return 0;
  }
  log.error(`traceability check failed: ${errors.length} problem(s)`);
  for (const error of errors) log.error(`  ${error}`);
  return 1;
}
