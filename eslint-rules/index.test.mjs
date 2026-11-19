import { RuleTester } from 'eslint';
import nextTs from 'eslint-config-next/typescript';
import { afterAll, describe, it } from 'vitest';
import plugin from './index.mjs';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});
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

const settleRule = plugin.rules['settle-server-actions'];
const unsettled = (name) => ({ messageId: 'unsettled', data: { name } });

tester.run('settle-server-actions (#82, ADR-0065)', settleRule, {
  valid: [
    { code: 'async function f(action) { await action(1); }', name: 'サーバーのファイルは対象の外' },
    { code: `${CLIENT}async function f(action, settle) { await settle(action(1), {}); }` },
    { code: `${CLIENT}function f(saveAction, settle) { return settle(saveAction(1), {}); }` },
    { code: `${CLIENT}function f(signOut) { signOut().catch(() => 1); }` },
    { code: `${CLIENT}function f(action) { action(1).then(() => 1, () => 2); }` },
    {
      code: `${CLIENT}function f(action, useMutation) { useMutation({ mutationFn: async () => { await action(1); } }); }`,
      name: 'TanStack Query の mutationFn は onError が受ける',
    },
    {
      code: `${CLIENT}function f(action, settle, useActionState) { useActionState(async (s, d) => settle(action(s, d), {}), undefined); }`,
    },
    {
      code: `${CLIENT}function f(fetchPage, onSaved) { fetchPage(1); onSaved(); }`,
      name: 'ほかの名前',
    },
    {
      code: `${CLIENT}function f(replyAction) { return { action: (text) => replyAction(text, 1) }; }`,
      name: '名前が action の関数で返す（受け取る側の呼び出しを確かめる）',
    },
    {
      code: `${CLIENT}function f(replyAction) { return <ComposeBox action={(text) => replyAction(text)} />; }`,
      name: 'JSX の action に渡す関数で返す',
    },
    {
      code: `${CLIENT}function f(likeAction) { const toggleAction = () => likeAction(1); return toggleAction; }`,
      name: '〜Action という名前の変数の関数で返す',
    },
    {
      code: `${CLIENT}async function sendAction(action) { try { return await action(1); } finally { done(); } }`,
      name: '〜Action という名前の関数の return await',
    },
  ],
  invalid: [
    {
      code: `${CLIENT}async function f(action) { await action(1); }`,
      errors: [unsettled('action')],
    },
    { code: `${CLIENT}function f(signOut) { void signOut(); }`, errors: [unsettled('signOut')] },
    {
      code: `${CLIENT}async function f(setFollowAction) { const r = await setFollowAction(1); }`,
      errors: [unsettled('setFollowAction')],
    },
    {
      code: `${CLIENT}function f(action) { action(1).then(() => 1); }`,
      errors: [unsettled('action')],
      name: '.then に失敗の受け手が無い',
    },
    {
      code: `${CLIENT}function f(signOut) { return <button onClick={() => signOut()} />; }`,
      errors: [unsettled('signOut')],
      name: 'void を外しても、受け手の無い呼び出しは止める（#82 のレビュー 3）',
    },
    {
      code: `${CLIENT}function f(saveAction) { const go = () => saveAction(1); go(); }`,
      errors: [unsettled('saveAction')],
      name: '名前が action でない関数で返す',
    },
    {
      code: `${CLIENT}function f(likeAction, run) { run(() => likeAction(1)); }`,
      errors: [unsettled('likeAction')],
      name: '名前の無い関数（引数の矢印関数）で返す',
    },
    {
      code: `${CLIENT}function f(action) { return <List>{() => action(1)}</List>; }`,
      errors: [unsettled('action')],
      name: 'JSX の子の矢印関数で返す（落ちずに止める、#82 のレビュー）',
    },
    {
      code: `${CLIENT}function f(action) { return action(1); }`,
      errors: [unsettled('action')],
      name: '名前が action でない関数の return',
    },
    {
      code: `${CLIENT}function f(action, useActionState) { useActionState(action, undefined); }`,
      errors: [unsettled('action')],
      name: 'useActionState へそのまま渡す',
    },
    {
      code: `${CLIENT}function f(signInAction, useActionState) { useActionState(signInAction, undefined); }`,
      errors: [unsettled('signInAction')],
    },
  ],
});

// The TypeScript form `action!(…)` (a prop that may be undefined), read with the project's parser.
const tsParser = nextTs.find((config) => config.languageOptions?.parser).languageOptions.parser;
new RuleTester({ languageOptions: { parser: tsParser } }).run(
  'settle-server-actions の TypeScript の形',
  settleRule,
  {
    valid: [
      {
        code: `${CLIENT}function f(action?: () => Promise<void>) { useMutation({ mutationFn: async () => { await action!(); } }); }`,
      },
    ],
    invalid: [
      {
        code: `${CLIENT}async function f(action?: () => Promise<void>) { await action!(); }`,
        errors: [unsettled('action')],
      },
      {
        code: `${CLIENT}function f(action: () => Promise<void>, use: (x: unknown) => void) { use(action().catch); }`,
        errors: [unsettled('action')],
        name: '受け手を渡すだけで呼ばない',
      },
      {
        code: `${CLIENT}function f(action: () => Promise<void>) { const later = action().finally; }`,
        errors: [unsettled('action')],
        name: '受け手を呼ばない',
      },
    ],
  },
);
