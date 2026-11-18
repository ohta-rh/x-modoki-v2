// src/ holds exactly the six FSD layers (ADR-0022, ADR-0030): no other entry, none missing.
// Steiger does not check this.
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LAYERS = ['_app', '_pages', 'widgets', 'features', 'entities', 'shared'];
const MESSAGE = `only the six FSD layers may sit directly under src/ (${LAYERS.join(', ')})`;

/** Returns one message per entry under <root>/src that is not a layer, and per missing layer. */
export function checkSrcLayers(root) {
  const src = join(root, 'src');
  if (!existsSync(src)) return ['src/: does not exist'];
  const entries = readdirSync(src, { withFileTypes: true });
  const extra = entries
    .filter((entry) => !(entry.isDirectory() && LAYERS.includes(entry.name)))
    .map((entry) => `src/${entry.name}: ${MESSAGE}`);
  const missing = LAYERS.filter(
    (layer) => !entries.some((entry) => entry.isDirectory() && entry.name === layer),
  ).map((layer) => `src/${layer}: missing FSD layer`);
  return [...extra, ...missing];
}

export function main(argv, log = console) {
  const at = argv.indexOf('--root');
  const root = at >= 0 ? argv[at + 1] : join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const errors = checkSrcLayers(root);
  if (errors.length === 0) {
    log.log('src layers check passed');
    return 0;
  }
  log.error(`src layers check failed: ${errors.length} problem(s)`);
  for (const error of errors) log.error(`  ${error}`);
  return 1;
}
