/** Local ESLint rules for x-modoki (ADR-0022, ADR-0030). Tests: eslint-rules/index.test.mjs. */
const SERVER_ONLY = [/(^|\/)index\.server$/, /^server-only$/, /^@\/shared\/db(\/|$)/];

function isClientModule(program) {
  for (const node of program.body) {
    if (node.type !== 'ExpressionStatement' || typeof node.directive !== 'string') return false;
    if (node.directive === 'use client') return true;
  }
  return false;
}

const noServerImportInClient = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      server: 'A \'use client\' module must not import the server-only module "{{source}}".',
    },
  },
  create(context) {
    if (!isClientModule(context.sourceCode.ast)) return {};
    const check = (node) => {
      const source = node.source?.value;
      if (typeof source === 'string' && SERVER_ONLY.some((re) => re.test(source))) {
        context.report({ node, messageId: 'server', data: { source } });
      }
    };
    return { ImportDeclaration: check, ExportNamedDeclaration: check, ExportAllDeclaration: check };
  },
};

const plugin = { rules: { 'no-server-import-in-client': noServerImportInClient } };
export default plugin;
