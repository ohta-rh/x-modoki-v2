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

// The names Server Actions go by in client code: a prop `action`, `…Action`, or `signOut`.
const ACTION_NAME = /^(action|signOut|[a-z]\w*Action)$/;

const calleeName = (callee) => {
  const target = callee.type === 'TSNonNullExpression' ? callee.expression : callee;
  return target.type === 'Identifier' ? target.name : null;
};

const enclosingFunction = (node) => {
  let current = node.parent;
  while (!current.type.endsWith('FunctionExpression') && current.type !== 'FunctionDeclaration') {
    current = current.parent;
  }
  return current;
};

/** The name a function goes by: its own, its variable's, its property's or its JSX attribute's. */
const functionName = (fn) => {
  if (fn.id) return fn.id.name;
  const parent = fn.parent;
  if (parent.type === 'VariableDeclarator') return parent.id.name;
  if (parent.type === 'Property') return parent.key.name;
  if (parent.type === 'JSXExpressionContainer') return parent.parent.name.name;
  return null;
};

/**
 * A Server Action called from the browser rejects when the request fails (offline). Unless that
 * rejection is taken — `settle(…)`, `.catch(…)`, `.then(ok, failed)`, or a TanStack Query
 * `mutationFn`, whose `onError` takes it — it replaces the page with the error screen or is lost
 * (#70, #82, ADR-0065). A call returned by a function itself named as an action is that function's
 * caller's to take; the rule checks that call.
 */
const settleServerActions = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      unsettled:
        'A Server Action "{{name}}" called in a client module must take its failure: settle(…), .catch(…), .then(ok, failed) or a mutationFn (ADR-0065).',
    },
  },
  create(context) {
    if (!isClientModule(context.sourceCode.ast)) return {};
    const taken = (node) => {
      // Handed back to whoever calls the enclosing function — allowed only when that function is
      // itself named as an action (`action={…}`, `sendAction`), so its own call is checked here.
      const handed = node.parent.type === 'AwaitExpression' ? node.parent : node;
      const returned =
        handed.parent.type === 'ReturnStatement' ||
        (handed.parent.type === 'ArrowFunctionExpression' && handed.parent.body === handed);
      if (returned && ACTION_NAME.test(functionName(enclosingFunction(handed)) ?? '')) return true;
      const parent = node.parent;
      if (
        parent.type === 'CallExpression' &&
        parent.arguments[0] === node &&
        calleeName(parent.callee) === 'settle'
      ) {
        return true;
      }
      if (parent.type === 'MemberExpression' && parent.object === node) {
        const call = parent.parent;
        const method = parent.property.name;
        if (call.type === 'CallExpression' && call.callee === parent) {
          if (method === 'catch') return true;
          if (method === 'then' && call.arguments.length >= 2) return true;
        }
      }
      return context.sourceCode
        .getAncestors(node)
        .some((ancestor) => ancestor.type === 'Property' && ancestor.key.name === 'mutationFn');
    };
    return {
      CallExpression(node) {
        const name = calleeName(node.callee);
        if (name === 'useActionState') {
          const first = node.arguments[0];
          if (first?.type === 'Identifier' && ACTION_NAME.test(first.name)) {
            context.report({ node: first, messageId: 'unsettled', data: { name: first.name } });
          }
          return;
        }
        if (name && ACTION_NAME.test(name) && !taken(node)) {
          context.report({ node, messageId: 'unsettled', data: { name } });
        }
      },
    };
  },
};

const plugin = {
  rules: {
    'no-server-import-in-client': noServerImportInClient,
    'settle-server-actions': settleServerActions,
  },
};
export default plugin;
