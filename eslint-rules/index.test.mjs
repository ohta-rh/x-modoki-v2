import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vitest';
import plugin from './index.mjs';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2024, sourceType: 'module' } });
const rule = plugin.rules['no-server-import-in-client'];
const CLIENT = "'use client';\n";
const error = (source) => ({ messageId: 'server', data: { source } });

tester.run('no-server-import-in-client (ADR-0030)', rule, {
  valid: [
    { code: `${CLIENT}import { PostCard } from '@/entities/post';` },
    {
      code: "import { listPosts } from '@/entities/post/index.server';",
      name: 'サーバーのファイルは読んでよい',
    },
    {
      code: "import 'server-only';\nimport { getDb } from '@/shared/db';",
      name: 'サーバーのファイルは db を読んでよい',
    },
    {
      code: `'use strict';\n${CLIENT}import { x } from './x';`,
      name: '先頭の指示が 2 つあっても、サーバー専用でなければよい',
    },
    {
      code: `const a = 1;\n${CLIENT}import { listPosts } from '@/entities/post/index.server';`,
      name: '途中の文字列は指示ではない',
    },
    { code: `${CLIENT}export { PostCard } from '@/entities/post';` },
    { code: `${CLIENT}export const x = 1;`, name: 'from の無い export' },
    { code: "'use strict';", name: '指示だけのファイル' },
  ],
  invalid: [
    {
      code: `${CLIENT}import { listPosts } from '@/entities/post/index.server';`,
      errors: [error('@/entities/post/index.server')],
    },
    { code: `${CLIENT}import 'server-only';`, errors: [error('server-only')] },
    { code: `${CLIENT}import { getDb } from '@/shared/db';`, errors: [error('@/shared/db')] },
    {
      code: `${CLIENT}import { schema } from '@/shared/db/schema';`,
      errors: [error('@/shared/db/schema')],
    },
    { code: `${CLIENT}import { x } from './index.server';`, errors: [error('./index.server')] },
    { code: `'use strict';\n${CLIENT}import 'server-only';`, errors: [error('server-only')] },
    {
      code: `${CLIENT}export { listPosts } from '@/entities/post/index.server';`,
      errors: [error('@/entities/post/index.server')],
    },
    { code: `${CLIENT}export * from '@/shared/db';`, errors: [error('@/shared/db')] },
  ],
});
