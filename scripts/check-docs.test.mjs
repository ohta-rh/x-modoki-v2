// Tests for scripts/lib/check-docs.mjs. Run with `pnpm test` (Vitest).
// Each test builds a small valid docs/ bundle in a temp directory, breaks one thing, and runs
// the check against it in-process (so it is measured by coverage, ADR-0021).

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { main } from './lib/check-docs.mjs';

const assert = {
  equal: (actual, expected, message) => expect(actual, message).toBe(expected),
  match: (actual, re) => expect(actual).toMatch(re),
  ok: (value, message) => expect(value, message).toBeTruthy(),
};

const fm = (type, title, description, status = 'stable') =>
  `---\ntype: ${type}\ntitle: "${title}"\ndescription: "${description}"\ntags: [x]\nstatus: ${status}\n---\n\n# ${title}\n`;

const REPORT = 'issue-0007-sample';
const reportBody = (shot = `![s](evidence/${REPORT}/a-375.jpg)`) =>
  `${fm('TestReport', '試験レポート: サンプル', 'サンプルの試験の記録。')}
## 対象

## 環境

## 判定

## 受け入れ条件ごとの結果

## 自動のテスト

### TDD の記録

コードの変更なし

## コードレビュー

コードの変更なし

## ブラウザでの確認

${shot}

## 見つけた問題

なし
`;

/** A minimal bundle that passes every check. */
function validBundle() {
  return {
    'docs/index.md': `---\nokf_version: "0.2"\n---\n\n# Docs\n\n* [architecture/](architecture/index.md) - 設計\n* [adr/](adr/) - 決定\n* [test-reports/](test-reports/index.md) - 試験\n* [log.md](log.md) - 履歴\n\n# type\n\n* \`ADR\` - a\n* \`Reference\` - a\n* \`Architecture\` - a\n* \`TestReport\` - a\n`,
    'docs/log.md': `# Log\n\n## 2026-11-18\n* [ADR-0001](adr/0001-first.md)、[report](test-reports/${REPORT}.md)\n\n## 2026-11-17\n* init\n`,
    'docs/adr/README.md': `${fm('Reference', 'ADRs', 'ADR の一覧。')}\n| ADR | t | s |\n|---|---|---|\n| [0001](0001-first.md) | First | 採用 |\n`,
    'docs/adr/0001-first.md': `${fm('ADR', 'ADR-0001: First', '最初の決定。')}\n- ステータス: 採用\n\n## 背景\n\n## 決定\n\n## 検討した選択肢\n\n## 結果\n`,
    'docs/architecture/index.md': `# A\n\n* [Overview](overview.md) - 全体の説明。\n`,
    'docs/architecture/overview.md': fm('Architecture', 'Overview', '全体の説明。'),
    'docs/test-reports/index.md': `# R\n\n* [試験レポート: サンプル](${REPORT}.md) - サンプルの試験の記録。\n`,
    [`docs/test-reports/${REPORT}.md`]: reportBody(),
    [`docs/test-reports/evidence/${REPORT}/a-375.jpg`]: 'jpeg-bytes',
  };
}

function run(mutate) {
  const root = mkdtempSync(join(tmpdir(), 'check-docs-test-'));
  try {
    const files = validBundle();
    mutate?.(files);
    for (const [path, content] of Object.entries(files)) {
      if (content === null) continue;
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    const lines = [];
    const log = { log: (line) => lines.push(line), error: (line) => lines.push(line) };
    const status = main(['--root', root], log);
    return { status, output: lines.join('\n') };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function rejects(name, mutate, message) {
  test(name, () => {
    const { status, output } = run(mutate);
    assert.equal(status, 1, `expected exit 1, got ${status}\n${output}`);
    assert.match(output, message);
  });
}

const report = `docs/test-reports/${REPORT}.md`;
const overview = 'docs/architecture/overview.md';

test('a valid bundle passes', () => {
  const { status, output } = run();
  assert.equal(status, 0, output);
});

// NFR-MAINT-05: `docs/` が OKF の形で、`node scripts/check-docs.mjs` が通る
test('the repository itself passes', () => {
  const lines = [];
  const status = main([], { log: (l) => lines.push(l), error: (l) => lines.push(l) });
  assert.equal(status, 0, lines.join('\n'));
});

test('scripts/check-docs.mjs sets the exit code when run as a command', async () => {
  const argv = process.argv;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  process.argv = ['node', 'check-docs.mjs'];
  try {
    await import('./check-docs.mjs');
    expect(process.exitCode).toBe(0);
  } finally {
    process.argv = argv;
    process.exitCode = undefined;
  }
});

test('a missing docs/ directory is reported', () => {
  const root = mkdtempSync(join(tmpdir(), 'check-docs-test-'));
  try {
    const lines = [];
    const status = main(['--root', root], {
      log: (l) => lines.push(l),
      error: (l) => lines.push(l),
    });
    assert.equal(status, 1);
    assert.match(lines.join('\n'), /docs\/ does not exist/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- behavior that existed before the review: pinned ---------------------------------------
rejects(
  'a document without frontmatter is rejected',
  (f) => {
    f[overview] = '# Overview\n';
  },
  /missing YAML frontmatter/,
);
rejects(
  'a broken relative link is rejected',
  (f) => {
    f[overview] += '\n[x](missing.md)\n';
  },
  /broken link "missing\.md"/,
);
rejects(
  'an ADR whose body status differs from its frontmatter is rejected',
  (f) => {
    f['docs/adr/0001-first.md'] = f['docs/adr/0001-first.md'].replace(
      'status: stable',
      'status: draft',
    );
  },
  /does not match frontmatter/,
);
rejects(
  'a test report without a screenshot is rejected',
  (f) => {
    f[report] = reportBody('写真なし');
  },
  /at least one screenshot/,
);
rejects(
  'a PBI test report without a TDD record is rejected',
  (f) => {
    f[report] = f[report].replace('### TDD の記録\n', '');
  },
  /TDD の記録/,
);

// --- review finding 1 -------------------------------------------------------------------------
rejects(
  'a screenshot that only appears inside a code fence does not count',
  (f) => {
    f[report] = reportBody('```\n![s](evidence/' + REPORT + '/a-375.jpg)\n```');
  },
  /at least one screenshot/,
);
rejects(
  'a screenshot whose file does not exist is rejected',
  (f) => {
    f[`docs/test-reports/evidence/${REPORT}/a-375.jpg`] = null;
  },
  /broken link|does not exist/,
);

// --- review finding 2 -------------------------------------------------------------------------
rejects(
  'a directory holding documents but no index.md is rejected',
  (f) => {
    f['docs/guides/run.md'] = fm('Architecture', 'Run', '動かし方。');
  },
  /docs\/guides.*index\.md/,
);
rejects(
  'a document at the bundle root that docs/index.md does not list is rejected',
  (f) => {
    f['docs/extra.md'] = fm('Architecture', 'Extra', '余分な文書。');
  },
  /does not list extra\.md/,
);
rejects(
  'a subdirectory that its parent index does not link is rejected',
  (f) => {
    f['docs/index.md'] = f['docs/index.md'].replace(
      '* [architecture/](architecture/index.md) - 設計\n',
      '',
    );
  },
  /does not list architecture\//,
);

// --- review finding 3 -------------------------------------------------------------------------
rejects(
  'an ADR that docs/log.md does not link is rejected',
  (f) => {
    f['docs/log.md'] = f['docs/log.md'].replace('[ADR-0001](adr/0001-first.md)、', '');
  },
  /0001-first\.md.*log\.md/,
);

// --- review finding 4 -------------------------------------------------------------------------
rejects(
  'a test report that is not stable is rejected',
  (f) => {
    f[report] = f[report].replace('status: stable', 'status: draft');
  },
  /test report must be `status: stable`/,
);
rejects(
  'test report sections out of order are rejected',
  (f) => {
    f[report] = f[report].replace('## 環境\n\n## 判定\n', '## 判定\n\n## 環境\n');
  },
  /sections must appear in order/,
);
rejects(
  'evidence outside the report’s own evidence directory is rejected',
  (f) => {
    f[report] = reportBody('![s](evidence/other/a.jpg)');
    f['docs/test-reports/evidence/other/a.jpg'] = 'x';
  },
  /evidence\/issue-0007-sample\//,
);
rejects(
  'PNG evidence is rejected',
  (f) => {
    f[report] = reportBody(`![s](evidence/${REPORT}/a.png)`);
    f[`docs/test-reports/evidence/${REPORT}/a.png`] = 'x';
  },
  /JPEG or WebP/,
);
rejects(
  'a TDD record outside 自動のテスト is rejected',
  (f) => {
    f[report] =
      f[report].replace('### TDD の記録\n\nコードの変更なし\n\n', '') + '\n### TDD の記録\n';
  },
  /TDD の記録.*自動のテスト/,
);
rejects(
  'a badly named test report is rejected',
  (f) => {
    f['docs/test-reports/My_Report.md'] = f[report];
    f[report] = null;
    f['docs/test-reports/index.md'] = f['docs/test-reports/index.md'].replace(
      `${REPORT}.md`,
      'My_Report.md',
    );
    f['docs/log.md'] = f['docs/log.md'].replace(`${REPORT}.md`, 'My_Report.md');
  },
  /must be named/,
);
rejects(
  'a PBI test report without a code review section is rejected',
  (f) => {
    f[report] = f[report].replace('## コードレビュー\n\nコードの変更なし\n\n', '');
  },
  /コードレビュー/,
);

// --- review findings 5-8 ----------------------------------------------------------------------
rejects(
  'an unquoted frontmatter value containing ": " is rejected',
  (f) => {
    f[overview] = f[overview].replace('description: "全体の説明。"', 'description: 説明: です。');
  },
  /not valid YAML/,
);
rejects(
  'forbidden provenance keys are rejected',
  (f) => {
    f[overview] = f[overview].replace('status: stable', 'status: stable\nverified: 2026-11-18');
  },
  /`verified` must not be written/,
);
rejects(
  'log headings that are not newest-first are rejected',
  (f) => {
    f['docs/log.md'] = f['docs/log.md'].replace('## 2026-11-17', '## 2026-11-19');
  },
  /newest first/,
);
rejects(
  'a description with two sentences is rejected',
  (f) => {
    f[overview] = f[overview].replace('全体の説明。', '一つ目。二つ目。');
    f['docs/architecture/index.md'] = f['docs/architecture/index.md'].replace(
      '全体の説明。',
      '一つ目。二つ目。',
    );
  },
  /one sentence/,
);
rejects(
  'a broken link with a title is rejected',
  (f) => {
    f[overview] += '\n[x](nope.md "title")\n';
  },
  /broken link "nope\.md"/,
);

// --- every remaining "Checked by the script" claim in documentation.md section 4 --------------
const adr = 'docs/adr/0001-first.md';
const readme = 'docs/adr/README.md';
const swap = (path, from, to) => (f) => {
  assert.ok(f[path].includes(from), `fixture ${path} has no "${from}"`);
  f[path] = f[path].replace(from, to);
};

rejects(
  'a type not listed in docs/index.md is rejected',
  swap(overview, 'type: Architecture', 'type: Unknown'),
  /not listed in docs\/index\.md/,
);
rejects(
  'a title that differs from the H1 is rejected',
  swap(overview, '# Overview', '# Something else'),
  /H1 must equal/,
);
rejects(
  'a missing required key is rejected',
  swap(overview, 'status: stable\n', ''),
  /missing `status`/,
);
rejects(
  'tags that are not a list are rejected',
  swap(overview, 'tags: [x]', 'tags: x'),
  /`tags` must be a YAML list/,
);
rejects(
  'an unknown status is rejected',
  swap(overview, 'status: stable', 'status: final'),
  /is not draft \| stable \| deprecated/,
);
rejects(
  'frontmatter in a directory index.md is rejected',
  (f) => {
    f['docs/architecture/index.md'] =
      `---\ntype: Reference\n---\n${f['docs/architecture/index.md']}`;
  },
  /must not have frontmatter/,
);
rejects(
  'an extra key in the root index frontmatter is rejected',
  swap('docs/index.md', 'okf_version: "0.2"', 'okf_version: "0.2"\ntype: Reference'),
  /exactly `okf_version`/,
);
rejects(
  'a log heading that is not a date is rejected',
  swap('docs/log.md', '## 2026-11-17', '## Nov 17'),
  /is not YYYY-MM-DD/,
);
rejects(
  'an index description that differs from the document is rejected',
  swap('docs/architecture/index.md', '全体の説明。', '別の説明。'),
  /differs from that document/,
);
rejects(
  'a bundle-absolute link is rejected',
  (f) => {
    f[overview] += '\n[x](/adr/0001-first.md)\n';
  },
  /bundle-absolute link/,
);
rejects(
  'a badly named ADR file is rejected',
  (f) => {
    f['docs/adr/0001-First.md'] = f[adr];
    f[adr] = null;
    f[readme] = f[readme].replace('0001-first.md', '0001-First.md');
    f['docs/log.md'] = f['docs/log.md'].replace('0001-first.md', '0001-First.md');
  },
  /must be named NNNN-kebab-title\.md/,
);
rejects(
  'an ADR title without its number is rejected',
  (f) => {
    f[adr] = f[adr].replaceAll('ADR-0001: First', 'First');
  },
  /title must start with "ADR-0001: "/,
);
rejects(
  'an ADR missing a section is rejected',
  swap(adr, '## 結果\n', ''),
  /missing section "## 結果"/,
);
rejects(
  'a task list in an ADR is rejected',
  (f) => {
    f[adr] += '\n- [ ] やること\n';
  },
  /must not contain a task list/,
);
rejects(
  'an ADR status that differs in README is rejected',
  swap(readme, '| 採用 |', '| 提案 |'),
  /status in docs\/adr\/README\.md differs/,
);
rejects(
  'an ADR missing from README is rejected',
  swap(readme, '| [0001](0001-first.md) | First | 採用 |\n', ''),
  /is not listed in docs\/adr\/README\.md/,
);
rejects(
  'a gap in ADR numbers is rejected',
  (f) => {
    f['docs/adr/0003-third.md'] = f[adr].replaceAll('0001', '0003');
    f[readme] += '| [0003](0003-third.md) | Third | 採用 |\n';
    f['docs/log.md'] = f['docs/log.md'].replace(
      '[ADR-0001]',
      '[ADR-0003](adr/0003-third.md)、[ADR-0001]',
    );
  },
  /must be sequential \(expected 0002\)/,
);
rejects(
  'a test report title without the prefix is rejected',
  (f) => {
    f[report] = f[report].replaceAll('試験レポート: サンプル', 'サンプル');
    f['docs/test-reports/index.md'] = f['docs/test-reports/index.md'].replace(
      '試験レポート: サンプル',
      'サンプル',
    );
  },
  /title must start with "試験レポート: "/,
);
rejects(
  'a test report that docs/log.md does not link is rejected',
  swap('docs/log.md', `、[report](test-reports/${REPORT}.md)`, ''),
  /issue-0007-sample\.md: is not linked from docs\/log\.md/,
);
rejects(
  'a test report missing a section is rejected',
  swap(report, '## 環境\n\n', ''),
  /missing section "## 環境"/,
);
rejects(
  'evidence larger than 300KB is rejected',
  (f) => {
    f[`docs/test-reports/evidence/${REPORT}/a-375.jpg`] = 'x'.repeat(301 * 1024);
  },
  /larger than 300KB/,
);
rejects(
  'more than 12 screenshots are rejected',
  (f) => {
    f[report] = reportBody(
      Array.from({ length: 13 }, () => `![s](evidence/${REPORT}/a-375.jpg)`).join('\n'),
    );
  },
  /at most 12 screenshots/,
);

// --- second review, finding 2 ---------------------------------------------------------------
rejects(
  'a section heading that only appears inside a code fence does not count',
  swap(report, '## 環境\n', '```\n## 環境\n```\n'),
  /missing section "## 環境"/,
);
rejects(
  'a TDD record that only appears inside a code fence does not count',
  swap(report, '### TDD の記録\n', '```\n### TDD の記録\n```\n'),
  /TDD の記録/,
);

// --- third review, findings 1 and 2 -----------------------------------------------------------
rejects(
  'an image with a title is still checked as evidence',
  (f) => {
    f[report] = reportBody(`![s](evidence/${REPORT}/a-375.jpg)\n![t](evidence/other/b.png "t")`);
    f['docs/test-reports/evidence/other/b.png'] = 'x';
  },
  /evidence "evidence\/other\/b\.png" must be under/,
);
rejects(
  'evidence that escapes its directory with ".." is rejected',
  (f) => {
    f[report] = reportBody(`![s](evidence/${REPORT}/../other/c.jpg)`);
    f['docs/test-reports/evidence/other/c.jpg'] = 'x';
  },
  /must be under evidence\/issue-0007-sample\//,
);

// --- pinned while bringing scripts under coverage (#15) -------------------------------------
rejects(
  'a frontmatter line without a key is rejected',
  swap(overview, 'status: stable', 'status: stable\njust some text'),
  /not valid YAML: just some text/,
);
rejects(
  'an ADR without a status line is rejected',
  swap(adr, '- ステータス: 採用\n', ''),
  /no `- ステータス:` line/,
);
rejects(
  'frontmatter that is never closed counts as missing',
  (f) => {
    f[overview] = '---\ntype: Architecture\n\n# Overview\n';
  },
  /missing YAML frontmatter/,
);
rejects(
  'a root index without frontmatter is rejected',
  (f) => {
    f['docs/index.md'] = f['docs/index.md'].replace('---\nokf_version: "0.2"\n---\n\n', '');
  },
  /exactly `okf_version`/,
);
test('a bundle without docs/adr passes', () => {
  const { status, output } = run((f) => {
    for (const key of Object.keys(f)) if (key.startsWith('docs/adr/')) f[key] = null;
    f['docs/index.md'] = f['docs/index.md']
      .replace('* [adr/](adr/) - 決定\n', '')
      .replace('* `ADR` - a\n', '');
    f['docs/log.md'] = f['docs/log.md'].replace('[ADR-0001](adr/0001-first.md)、', '');
  });
  assert.equal(status, 0, output);
});
