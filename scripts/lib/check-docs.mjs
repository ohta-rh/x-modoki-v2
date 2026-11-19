// Validates the docs/ OKF v0.2 bundle (ADR-0002) and the ADR conventions
// (.claude/rules/documentation.md, .claude/rules/definition-of-done.md, .claude/rules/tdd.md,
// .claude/rules/code-review.md). No dependencies. Entry point: scripts/check-docs.mjs.
//
//   node scripts/check-docs.mjs [--root <dir>]     tests: scripts/check-docs.test.mjs (Vitest)
//
// Frontmatter is read with a small parser, not a YAML library: one `key: value` per line,
// values either quoted, a `[a, b]` list, or a plain scalar without ": ". Anything else is
// reported as invalid rather than guessed at.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, normalize, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RESERVED = new Set(['index.md', 'log.md']);
const STATUSES = new Set(['draft', 'stable', 'deprecated']);
const REQUIRED_KEYS = ['type', 'title', 'description', 'status'];
const FORBIDDEN_KEYS = ['generated', 'verified', 'sources', 'stale_after'];
const REPORT_SECTIONS = [
  '## 対象',
  '## 環境',
  '## 判定',
  '## 受け入れ条件ごとの結果',
  '## 自動のテスト',
  '## コードレビュー',
  '## ブラウザでの確認',
  '## 見つけた問題',
];
const REPORT_NAME = /^(issue-\d{4}|\d{4}-\d{2}-\d{2})-[a-z0-9-]+\.md$/;
const ADR_STATUS = {
  提案: 'draft',
  採用: 'stable',
  却下: 'deprecated',
  廃止: 'deprecated',
  置き換え: 'deprecated',
};

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return name.endsWith('.md') ? [path] : [];
  });
}

/** Splits a file into its frontmatter map (or null) and its body. */
function parse(source) {
  if (!source.startsWith('---\n')) return { frontmatter: null, body: source, invalid: [] };
  const end = source.indexOf('\n---\n', 4);
  if (end < 0) return { frontmatter: null, body: source, invalid: [] };
  const frontmatter = {};
  const invalid = [];
  for (const line of source.slice(4, end).split('\n')) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const at = line.indexOf(':');
    if (at <= 0) {
      invalid.push(line);
      continue;
    }
    const raw = line.slice(at + 1).trim();
    const quoted = /^".*"$/.test(raw);
    if (!quoted && !raw.startsWith('[') && raw.includes(': ')) invalid.push(line);
    frontmatter[line.slice(0, at).trim()] = quoted ? raw.slice(1, -1) : raw;
  }
  return { frontmatter, body: source.slice(end + 5), invalid };
}

/** Markdown with fenced and inline code removed, so examples are not read as links. */
function withoutCode(source) {
  return source.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

function indexEntries(source) {
  return [...source.matchAll(/^\* \[[^\]]*\]\(([^)]+)\) - (.+)$/gm)].map((m) => ({
    link: m[1],
    description: m[2].trim(),
  }));
}

/** Checks the docs/ bundle under repoRoot. Returns the number of files and every problem. */
export function checkDocs(repoRoot) {
  const docsRoot = join(repoRoot, 'docs');
  const errors = [];
  const rel = (path) => relative(repoRoot, path);
  const fail = (path, message) => errors.push(`${rel(path)}: ${message}`);

  const files = walk(docsRoot).sort();
  const descriptions = new Map();
  const knownTypes = new Set(
    [...readFileSync(join(docsRoot, 'index.md'), 'utf8').matchAll(/^\* `([^`]+)` - /gm)].map(
      (m) => m[1],
    ),
  );

  for (const path of files) {
    const source = readFileSync(path, 'utf8');
    const { frontmatter, body, invalid } = parse(source);
    const name = basename(path);
    for (const line of invalid) fail(path, `frontmatter line is not valid YAML: ${line.trim()}`);

    if (RESERVED.has(name)) {
      const isRootIndex = path === join(docsRoot, 'index.md');
      if (isRootIndex) {
        const keys = frontmatter ? Object.keys(frontmatter) : [];
        if (keys.length !== 1 || keys[0] !== 'okf_version') {
          fail(
            path,
            'the bundle-root index.md must carry exactly `okf_version` in its frontmatter',
          );
        }
      } else if (frontmatter) {
        fail(path, 'a reserved file (index.md / log.md) must not have frontmatter');
      }
      if (name === 'log.md') {
        const dates = [...body.matchAll(/^## (.+)$/gm)].map((heading) => heading[1]);
        for (const date of dates) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
            fail(path, `log heading "${date}" is not YYYY-MM-DD`);
        }
        if (dates.some((date, i) => i > 0 && date >= dates[i - 1])) {
          fail(path, 'log headings must be newest first');
        }
      }
    } else if (!frontmatter) {
      fail(path, 'missing YAML frontmatter');
    } else {
      for (const key of REQUIRED_KEYS) {
        if (!frontmatter[key]) fail(path, `frontmatter is missing \`${key}\``);
      }
      if (frontmatter.tags === undefined || !/^\[.*\]$/.test(frontmatter.tags)) {
        fail(path, 'frontmatter `tags` must be a YAML list ([a, b])');
      }
      if (frontmatter.status && !STATUSES.has(frontmatter.status)) {
        fail(path, `status "${frontmatter.status}" is not draft | stable | deprecated`);
      }
      if (frontmatter.type && !knownTypes.has(frontmatter.type)) {
        fail(path, `type "${frontmatter.type}" is not listed in docs/index.md`);
      }
      const heading = body.match(/^# (.+)$/m);
      if (!heading || heading[1].trim() !== frontmatter.title) {
        fail(path, 'the first H1 must equal the frontmatter `title`');
      }
      if (
        frontmatter.description &&
        (!/[。.]$/.test(frontmatter.description) || /。.|\. \S/.test(frontmatter.description))
      ) {
        fail(path, '`description` must be exactly one sentence ending with a full stop');
      }
      for (const key of FORBIDDEN_KEYS) {
        if (key in frontmatter) fail(path, `\`${key}\` must not be written (ADR-0002)`);
      }
      descriptions.set(path, frontmatter.description);

      if (frontmatter.type === 'TestReport') {
        // ADR-0025, ADR-0026, ADR-0027. Images inside code are examples, not evidence.
        const stem = name.replace(/\.md$/, '');
        const prose = withoutCode(body);
        const images = [...prose.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map(
          (m) => m[1],
        );
        const evidenceDir = join(dirname(path), 'evidence', stem) + sep;
        if (!REPORT_NAME.test(name)) {
          fail(
            path,
            'a test report must be named issue-NNNN-<summary>.md or YYYY-MM-DD-<summary>.md',
          );
        }
        if (frontmatter.status !== 'stable') fail(path, 'a test report must be `status: stable`');
        if (!frontmatter.title?.startsWith('試験レポート: ')) {
          fail(path, 'a test report title must start with "試験レポート: "');
        }
        if (images.length === 0) {
          fail(path, 'a test report needs at least one screenshot under evidence/');
        }
        for (const src of images) {
          // Compare resolved paths, so `evidence/<stem>/../elsewhere/x.jpg` does not slip through.
          if (!normalize(join(dirname(path), src)).startsWith(evidenceDir)) {
            fail(path, `evidence "${src}" must be under evidence/${stem}/`);
          } else if (!/\.(jpe?g|webp)$/i.test(src)) {
            fail(path, `evidence "${src}" must be JPEG or WebP`);
          }
          const file = normalize(join(dirname(path), src));
          if (existsSync(file) && statSync(file).size > 300 * 1024) {
            fail(path, `evidence "${src}" is larger than 300KB`);
          }
        }
        if (images.length > 12) fail(path, 'a test report may hold at most 12 screenshots');

        const isPbiReport = /^issue-\d{4}-/.test(name);
        // Headings inside code are examples too: look for sections in the prose only.
        const at = (heading) => `\n${prose}`.indexOf(`\n${heading}\n`);
        const present = REPORT_SECTIONS.filter((section) => at(section) >= 0);
        for (const section of REPORT_SECTIONS) {
          const optional = section === '## コードレビュー' && !isPbiReport;
          if (at(section) < 0 && !optional) fail(path, `missing section "${section}"`);
        }
        if (present.some((section, i) => i > 0 && at(section) < at(present[i - 1]))) {
          fail(path, `sections must appear in order: ${REPORT_SECTIONS.join(' → ')}`);
        }
        const tdd = at('### TDD の記録');
        if (isPbiReport && tdd < 0) {
          fail(path, 'a PBI test report needs a "### TDD の記録" subsection');
        }
        if (tdd >= 0) {
          const start = at('## 自動のテスト');
          const next = `\n${prose}`.indexOf('\n## ', start + 1);
          if (start < 0 || tdd < start || (next >= 0 && tdd > next)) {
            fail(path, '"### TDD の記録" must sit under "## 自動のテスト"');
          }
        }
      }

      if (frontmatter.type === 'ADR') {
        const number = name.slice(0, 4);
        if (!/^\d{4}-[a-z0-9-]+\.md$/.test(name)) {
          fail(path, 'an ADR file must be named NNNN-kebab-title.md');
        }
        if (!frontmatter.title?.startsWith(`ADR-${number}: `)) {
          fail(path, `title must start with "ADR-${number}: "`);
        }
        const status = body.match(/^- ステータス: (提案|採用|却下|廃止|置き換え)/m);
        if (!status) {
          fail(path, 'body has no `- ステータス:` line with a known status');
        } else if (ADR_STATUS[status[1]] !== frontmatter.status) {
          fail(
            path,
            `body status "${status[1]}" does not match frontmatter "${frontmatter.status}"`,
          );
        }
        for (const section of ['## 背景', '## 決定', '## 検討した選択肢', '## 結果']) {
          if (!body.includes(`\n${section}\n`)) fail(path, `missing section "${section}"`);
        }
        if (/^\s*- \[[ xX]\] /m.test(withoutCode(body))) {
          fail(path, 'an ADR must not contain a task list');
        }
      }
    }

    for (const match of withoutCode(source).matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const link = match[1];
      if (/^(https?:|mailto:|#)/.test(link)) continue;
      if (link.startsWith('/')) {
        fail(path, `bundle-absolute link "${link}" — use a relative link (ADR-0002)`);
        continue;
      }
      const target = normalize(join(dirname(path), link.split('#')[0]));
      if (!existsSync(target)) fail(path, `broken link "${link}"`);
    }
  }

  // Every directory that holds documents has an index.md (docs/adr uses README.md instead),
  // and each index lists every document and every document-holding subdirectory beside it.
  const adrDir = join(docsRoot, 'adr');
  const holdsDocs = (dir) => files.some((file) => file.startsWith(`${dir}/`));
  const directories = [...new Set(files.map((file) => dirname(file)))];
  for (const dir of directories) {
    if (dir !== adrDir && !existsSync(join(dir, 'index.md'))) {
      fail(dir, 'holds documents but has no index.md');
    }
  }
  for (const path of files.filter((file) => basename(file) === 'index.md')) {
    const dir = dirname(path);
    const entries = indexEntries(readFileSync(path, 'utf8'));
    for (const { link, description } of entries) {
      const target = normalize(join(dir, link));
      if (descriptions.has(target) && descriptions.get(target) !== description) {
        fail(path, `description of "${link}" differs from that document's frontmatter`);
      }
    }
    const links = entries.map(({ link }) => link);
    const listed = new Set(links.map((link) => normalize(join(dir, link))));
    for (const name of readdirSync(dir)) {
      const child = join(dir, name);
      if (statSync(child).isDirectory()) {
        if (holdsDocs(child) && !links.some((link) => link.startsWith(`${name}/`))) {
          fail(path, `does not list ${name}/`);
        }
      } else if (name.endsWith('.md') && name !== 'index.md' && !listed.has(child)) {
        fail(path, `does not list ${name}`);
      }
    }
  }

  // Every ADR and every test report is linked from docs/log.md (documentation.md section 3).
  const log = readFileSync(join(docsRoot, 'log.md'), 'utf8');
  for (const path of files) {
    const fromDocs = relative(docsRoot, path);
    const logged = /^adr\/\d{4}-/.test(fromDocs) || /^test-reports\/[^/]+\.md$/.test(fromDocs);
    if (logged && basename(path) !== 'index.md' && !log.includes(`(${fromDocs})`)) {
      fail(path, 'is not linked from docs/log.md');
    }
  }

  // docs/adr has README.md instead of index.md; it must list every ADR, numbered without gaps.
  if (existsSync(adrDir)) {
    const readme = readFileSync(join(adrDir, 'README.md'), 'utf8');
    const adrs = readdirSync(adrDir)
      .filter((name) => /^\d{4}-/.test(name))
      .sort();
    adrs.forEach((name, i) => {
      const path = join(adrDir, name);
      if (!readme.includes(`(${name})`)) fail(path, 'is not listed in docs/adr/README.md');
      const expected = String(i + 1).padStart(4, '0');
      if (name.slice(0, 4) !== expected)
        fail(path, `ADR numbers must be sequential (expected ${expected})`);
      const row =
        readme.split('\n').find((line) => line.startsWith('| [') && line.includes(`(${name})`)) ??
        '';
      const status = readFileSync(path, 'utf8')
        .match(/^- ステータス: (.+)$/m)?.[1]
        .trim();
      if (status && !row.includes(`| ${status} |`)) {
        fail(path, `status in docs/adr/README.md differs from the ADR ("${status}")`);
      }
    });
  }

  checkAdrCitations(repoRoot, fail);
  return { files: files.length, errors };
}

/** Where code, tests, configs and the harness live: every ADR they cite must exist (#39). */
const CITING = ['app', 'src', 'e2e', 'scripts', 'eslint-rules', 'docker', '.claude', '.github'];
const TEXT = /\.(?:[cm]?[jt]sx?|json|ya?ml|md|sh|css|toml)$/;

function textFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return textFiles(path);
    return TEXT.test(name) ? [path] : [];
  });
}

function checkAdrCitations(repoRoot, fail) {
  const adrDir = join(repoRoot, 'docs', 'adr');
  if (!existsSync(adrDir)) return;
  const known = new Set(readdirSync(adrDir).map((name) => name.slice(0, 4)));
  const roots = readdirSync(repoRoot)
    .map((name) => join(repoRoot, name))
    .filter((path) => statSync(path).isFile() && TEXT.test(path));
  const paths = [...roots, ...CITING.flatMap((dir) => textFiles(join(repoRoot, dir)))];
  for (const path of paths) {
    const cited = new Set(
      [...readFileSync(path, 'utf8').matchAll(/\bADR-(\d{4})\b/g)].map((m) => m[1]),
    );
    for (const number of cited) {
      if (!known.has(number)) fail(path, `cites ADR-${number}, which is not in docs/adr`);
    }
  }
}

/** CLI: `--root <dir>` checks another tree (used by the tests); the default is this repository. */
export function main(argv, log = console) {
  const at = argv.indexOf('--root');
  const repoRoot =
    at >= 0 ? argv[at + 1] : join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  if (!existsSync(join(repoRoot, 'docs'))) {
    log.error('docs/ does not exist');
    return 1;
  }
  const { files, errors } = checkDocs(repoRoot);
  if (errors.length > 0) {
    log.error(`docs check failed: ${errors.length} problem(s) in ${files} file(s)`);
    for (const error of errors) log.error(`  ${error}`);
    return 1;
  }
  log.log(`docs check passed: ${files} file(s)`);
  return 0;
}
