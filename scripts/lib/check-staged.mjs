// The documentation checks on what is about to be committed (#39): `check-docs` passed on the
// working tree while the committed tree broke CI (c61f57f, 6c382f4), and checks joined to a commit
// with `;` let a commit through (9ca1b92). Run by the pre-commit hook in .githooks/.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main as checkDocs } from './check-docs.mjs';
import { main as checkTraceability } from './check-traceability.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Writes the index of the repository at `repo` (the staged files) into `out`. */
export function exportIndex(repo, out) {
  execFileSync('git', ['checkout-index', '--all', `--prefix=${out}/`], {
    cwd: repo,
    stdio: 'pipe',
  });
}

/** Exports the staged tree, runs the checks on it, removes it; 1 if any check failed. */
export function main(
  log = console,
  {
    exportIndex: write = exportIndex,
    checks = [
      (root) => checkDocs(['--root', root], log),
      (root) => checkTraceability(['--root', root], log),
    ],
  } = {},
) {
  const out = mkdtempSync(join(tmpdir(), 'x-modoki-staged-'));
  try {
    write(REPO, out);
    return checks.map((check) => check(out)).some((status) => status !== 0) ? 1 : 0;
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}
