// Tests for scripts/check-docs.mjs. Run with `node --test scripts/`.
// Each test builds a small valid docs/ bundle in a temp directory, breaks one thing, and runs
// the script against it with `--root`.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = join(dirname(fileURLToPath(import.meta.url)), 'check-docs.mjs');

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
    const result = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });
    return { status: result.status, output: result.stdout + result.stderr };
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

test('the repository itself passes', () => {
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
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
    f['docs/adr/0001-first.md'] = f['docs/adr/0001-first.md'].replace('status: stable', 'status: draft');
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
    f['docs/index.md'] = f['docs/index.md'].replace('* [architecture/](architecture/index.md) - 設計\n', '');
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
    f[report] = f[report].replace('### TDD の記録\n\nコードの変更なし\n\n', '') + '\n### TDD の記録\n';
  },
  /TDD の記録.*自動のテスト/,
);
rejects(
  'a badly named test report is rejected',
  (f) => {
    f['docs/test-reports/My_Report.md'] = f[report];
    f[report] = null;
    f['docs/test-reports/index.md'] = f['docs/test-reports/index.md'].replace(`${REPORT}.md`, 'My_Report.md');
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
    f['docs/architecture/index.md'] = f['docs/architecture/index.md'].replace('全体の説明。', '一つ目。二つ目。');
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

test('the script header states which checks it performs', () => {
  assert.match(readFileSync(script, 'utf8'), /--root/);
});
