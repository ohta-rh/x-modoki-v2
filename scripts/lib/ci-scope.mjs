// Which CI checks a push needs (ADR-0073). Changes since the last fully verified commit that touch
// only documents run the light checks; anything else, or any doubt, runs every gate. Comparing with
// the last fully verified commit, not the previous one, keeps a code commit whose run was cancelled
// by a later documents-only push from slipping through unverified.
import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/** The jobs that together are every gate; a commit is fully verified when all of them passed. */
export const FULL_JOBS = ['verify', 'e2e (chromium)', 'e2e (firefox)', 'e2e (webkit)'];
/** Before ADR-0073 every gate ran in this one job. */
const LEGACY_FULL_JOB = 'verify (8 gates)';

const DOCS = [/^docs\//, /^\.claude\//, /^(README|CHANGELOG|CLAUDE)\.md$/, /^LICENSE$/];
/**
 * Documents a gate outside `docs:check` reads, so they count as code (ADR-0073 review 1):
 * `check-authz` (lint) reads the threat model; scripts/quality-gates.test.ts reads the guide and the
 * hook settings. scripts/ci-scope.test.mjs fails when a gate starts reading another one.
 */
export const GATE_INPUTS = [
  'docs/architecture/threat-model.md',
  'docs/guides/local-development.md',
  '.claude/settings.json',
];

/** True when every changed file is a document no gate but docs:check reads (and there is one). */
export function isDocsOnly(files) {
  return (
    files.length > 0 &&
    files.every((file) => !GATE_INPUTS.includes(file) && DOCS.some((pattern) => pattern.test(file)))
  );
}

/** The newest ancestor that is fully verified, or null. */
export function pickBase(ancestors, fullyVerified) {
  return ancestors.find((sha) => fullyVerified(sha)) ?? null;
}

/** `{ scope: 'docs' | 'full', ... }`; every error and every doubt means `full`. */
export function decide({ ancestors, fullyVerified, changedFiles }) {
  try {
    const base = pickBase(ancestors(), fullyVerified);
    if (base === null) return { scope: 'full', reason: 'no fully verified ancestor' };
    const files = changedFiles(base);
    return isDocsOnly(files)
      ? { scope: 'docs', base, files }
      : { scope: 'full', base, reason: 'code or configuration changed' };
  } catch (error) {
    return { scope: 'full', reason: error.message };
  }
}

/** The real git and GitHub lookups; `run` is replaceable for the tests. */
export function defaultDeps({
  run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }),
  repo = process.env.GITHUB_REPOSITORY,
} = {}) {
  return {
    ancestors: () =>
      run('git', ['log', '--format=%H', '-n', '50', 'HEAD~1']).split('\n').filter(Boolean),
    fullyVerified: (sha) => {
      const passed = JSON.parse(
        run('gh', [
          'api',
          `repos/${repo}/commits/${sha}/check-runs?per_page=100`,
          '--jq',
          '[.check_runs[] | select(.conclusion == "success") | .name]',
        ]),
      );
      return passed.includes(LEGACY_FULL_JOB) || FULL_JOBS.every((job) => passed.includes(job));
    },
    changedFiles: (base) =>
      run('git', ['diff', '--name-only', base, 'HEAD']).split('\n').filter(Boolean),
  };
}

export function main({
  deps = defaultDeps(),
  append = appendFileSync,
  log = console.log,
  output = process.env.GITHUB_OUTPUT,
} = {}) {
  if (!output) {
    log('ci-scope: GITHUB_OUTPUT is not set (run it in GitHub Actions)');
    return 1;
  }
  const result = decide(deps);
  append(output, `scope=${result.scope}\n`);
  log(
    result.scope === 'docs'
      ? `ci-scope: docs only since ${result.base} (${result.files.length} file(s)): light checks`
      : `ci-scope: full: ${result.reason}`,
  );
  return 0;
}
