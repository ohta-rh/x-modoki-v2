// The PostToolUse hook for Edit and Write (ADR-0074): formats the file just edited with the
// project's Prettier, so the format gate never fails on it and no separate step is spent. It never
// blocks: a file Prettier cannot parse is left as it is, and the format gate reports it.
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FORMATTED = /\.(?:[cm]?[jt]sx?|json|css|ya?ml|md)$/;

/** The edited file relative to `root`, when Prettier should format it; else null. */
export function target(event, root) {
  const file = event.tool_input?.file_path;
  if (typeof file !== 'string') return null;
  const path = relative(root, file);
  if (path.startsWith('..') || path.split(sep).includes('node_modules')) return null;
  return FORMATTED.test(path) ? path : null;
}

/** `input` is the hook's stdin (JSON); always returns 0. */
export function main(
  input,
  { root = ROOT, run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'ignore' }) } = {},
) {
  let path;
  try {
    path = target(JSON.parse(input), root);
  } catch {
    return 0;
  }
  if (path === null) return 0;
  try {
    run('node_modules/.bin/prettier', ['--write', '--ignore-unknown', path], root);
  } catch {
    // Left for the format gate to report.
  }
  return 0;
}
