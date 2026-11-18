#!/usr/bin/env node
// Validates the docs/ OKF v0.2 bundle (ADR-0002) and the ADR conventions
// (.claude/rules/documentation.md). No dependencies; run with `node scripts/check-docs.mjs`.
// Exits 1 and prints every problem if anything is wrong.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = join(repoRoot, 'docs');

const RESERVED = new Set(['index.md', 'log.md']);
const STATUSES = new Set(['draft', 'stable', 'deprecated']);
const REQUIRED_KEYS = ['type', 'title', 'description', 'status'];
const ADR_STATUS = {
  提案: 'draft',
  採用: 'stable',
  却下: 'deprecated',
  廃止: 'deprecated',
  置き換え: 'deprecated',
};

const errors = [];
const rel = (path) => relative(repoRoot, path);
const fail = (path, message) => errors.push(`${rel(path)}: ${message}`);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return name.endsWith('.md') ? [path] : [];
  });
}

/** Splits a file into its frontmatter map (or null) and its body. */
function parse(source) {
  if (!source.startsWith('---\n')) return { frontmatter: null, body: source };
  const end = source.indexOf('\n---\n', 4);
  if (end < 0) return { frontmatter: null, body: source };
  const frontmatter = {};
  for (const line of source.slice(4, end).split('\n')) {
    if (line.trim().startsWith('#') || !line.includes(':')) continue;
    const at = line.indexOf(':');
    frontmatter[line.slice(0, at).trim()] = line
      .slice(at + 1)
      .trim()
      .replace(/^"(.*)"$/, '$1');
  }
  return { frontmatter, body: source.slice(end + 5) };
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

if (!existsSync(docsRoot)) {
  console.error('docs/ does not exist');
  process.exit(1);
}

const files = walk(docsRoot).sort();
const descriptions = new Map();
const knownTypes = new Set(
  [...readFileSync(join(docsRoot, 'index.md'), 'utf8').matchAll(/^\* `([^`]+)` - /gm)].map(
    (m) => m[1],
  ),
);

for (const path of files) {
  const source = readFileSync(path, 'utf8');
  const { frontmatter, body } = parse(source);
  const name = basename(path);

  if (RESERVED.has(name)) {
    const isRootIndex = path === join(docsRoot, 'index.md');
    if (isRootIndex) {
      const keys = frontmatter ? Object.keys(frontmatter) : [];
      if (keys.length !== 1 || keys[0] !== 'okf_version') {
        fail(path, 'the bundle-root index.md must carry exactly `okf_version` in its frontmatter');
      }
    } else if (frontmatter) {
      fail(path, 'a reserved file (index.md / log.md) must not have frontmatter');
    }
    if (name === 'log.md') {
      for (const heading of body.matchAll(/^## (.+)$/gm)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(heading[1])) {
          fail(path, `log heading "${heading[1]}" is not YYYY-MM-DD`);
        }
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
    if (frontmatter.description && !/[。.]$/.test(frontmatter.description)) {
      fail(path, '`description` must be one sentence ending with a full stop');
    }
    descriptions.set(path, frontmatter.description);

    if (frontmatter.type === 'TestReport') {
      // ADR-0025: a report without a browser screenshot is not a report.
      const images = [...body.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => m[1]);
      if (!images.some((src) => /^evidence\/.+\.(jpe?g|webp|png)$/i.test(src))) {
        fail(path, 'a test report needs at least one screenshot under evidence/');
      }
      for (const src of images) {
        const file = normalize(join(dirname(path), src));
        if (existsSync(file) && statSync(file).size > 300 * 1024) {
          fail(path, `evidence "${src}" is larger than 300KB`);
        }
      }
      if (images.length > 12) fail(path, 'a test report may hold at most 12 screenshots');
      // ADR-0026: a PBI's report records each red, or states there was no code change.
      if (/^issue-\d{4}-/.test(name) && !body.includes('\n### TDD の記録\n')) {
        fail(path, 'a PBI test report needs a "### TDD の記録" subsection');
      }
      for (const section of [
        '## 対象',
        '## 環境',
        '## 判定',
        '## 受け入れ条件ごとの結果',
        '## 自動のテスト',
        '## ブラウザでの確認',
        '## 見つけた問題',
      ]) {
        if (!body.includes(`\n${section}\n`)) fail(path, `missing section "${section}"`);
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
        fail(path, `body status "${status[1]}" does not match frontmatter "${frontmatter.status}"`);
      }
      for (const section of ['## 背景', '## 決定', '## 検討した選択肢', '## 結果']) {
        if (!body.includes(`\n${section}\n`)) fail(path, `missing section "${section}"`);
      }
      if (/^\s*- \[[ xX]\] /m.test(withoutCode(body))) {
        fail(path, 'an ADR must not contain a task list');
      }
    }
  }

  for (const match of withoutCode(source).matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
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

// Each directory's index.md lists every document in it, with the document's own description.
for (const path of files.filter((file) => basename(file) === 'index.md')) {
  const dir = dirname(path);
  const entries = indexEntries(readFileSync(path, 'utf8'));
  for (const { link, description } of entries) {
    const target = normalize(join(dir, link));
    if (descriptions.has(target) && descriptions.get(target) !== description) {
      fail(path, `description of "${link}" differs from that document's frontmatter`);
    }
  }
  if (dir === docsRoot) continue;
  const listed = new Set(entries.map(({ link }) => normalize(join(dir, link))));
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (name.endsWith('.md') && name !== 'index.md' && !listed.has(file)) {
      fail(path, `does not list ${name}`);
    }
  }
}

// docs/adr has README.md instead of index.md; it must list every ADR, numbered without gaps.
const adrDir = join(docsRoot, 'adr');
if (existsSync(adrDir)) {
  const readme = readFileSync(join(adrDir, 'README.md'), 'utf8');
  const adrs = readdirSync(adrDir)
    .filter((name) => /^\d{4}-/.test(name))
    .sort();
  adrs.forEach((name, i) => {
    const path = join(adrDir, name);
    if (!readme.includes(`(${name})`)) fail(path, 'is not listed in docs/adr/README.md');
    const expected = String(i + 1).padStart(4, '0');
    if (name.slice(0, 4) !== expected) fail(path, `ADR numbers must be sequential (expected ${expected})`);
    const row =
      readme.split('\n').find((line) => line.startsWith('| [') && line.includes(`(${name})`)) ?? '';
    const status = readFileSync(path, 'utf8').match(/^- ステータス: (.+)$/m)?.[1].trim();
    if (status && !row.includes(`| ${status} |`)) {
      fail(path, `status in docs/adr/README.md differs from the ADR ("${status}")`);
    }
  });
}

if (errors.length > 0) {
  console.error(`docs check failed: ${errors.length} problem(s) in ${files.length} file(s)`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log(`docs check passed: ${files.length} file(s)`);
