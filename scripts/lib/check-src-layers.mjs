// src/ holds only the six FSD layers (ADR-0022, ADR-0030). Steiger does not check this.
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LAYERS = ['_app', '_pages', 'widgets', 'features', 'entities', 'shared'];
const MESSAGE = `only the six FSD layers may sit directly under src/ (${LAYERS.join(', ')})`;

/** Returns one message per entry directly under <root>/src that is not an FSD layer. */
export function checkSrcLayers(root) {
  const src = join(root, 'src');
  if (!existsSync(src)) return ['src/: does not exist'];
  return readdirSync(src, { withFileTypes: true })
    .filter((entry) => !(entry.isDirectory() && LAYERS.includes(entry.name)))
    .map((entry) => `src/${entry.name}: ${MESSAGE}`);
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
