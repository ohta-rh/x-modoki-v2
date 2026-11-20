// The PreToolUse hook for Bash (ADR-0074): refuses the commands that went wrong in Milestone 1,
// which a written rule did not stop. It splits the command the way the shell does — quotes,
// separators, subshells, `bash -c` payloads — and looks at each simple command: its prefixes
// (VAR=value, env, command, time, exec), a path to the binary, and git's global options. Anything
// it cannot parse is refused (~/.claude/rules/gate-design.md).

const SEPARATORS = ['&&', '||', ';', '&', '|', '\n', '(', ')', '`'];

/**
 * Splits `text` into simple commands: `[{ words, after }]`, where `after` is the separator before
 * it. Quotes group words and are removed; a backslash escapes the next character outside single
 * quotes. Throws on an unterminated quote.
 */
export function split(text) {
  const commands = [];
  let words = [];
  let word = '';
  let inWord = false;
  let after = null;
  const endWord = () => {
    if (inWord) words.push(word);
    word = '';
    inWord = false;
  };
  const endCommand = (separator) => {
    endWord();
    if (words.length > 0) commands.push({ words, after });
    words = [];
    after = separator;
  };
  for (let i = 0; i < text.length;) {
    const c = text[i];
    if (c === "'") {
      const end = text.indexOf("'", i + 1);
      if (end < 0) throw new Error('unterminated quote');
      word += text.slice(i + 1, end);
      inWord = true;
      i = end + 1;
    } else if (c === '"') {
      // Inside double quotes a backslash escapes ", \, $ and ` only.
      let j = i + 1;
      for (; j < text.length && text[j] !== '"'; j += 1) {
        if (text[j] === '\\' && '"\\$`'.includes(text[j + 1] ?? '')) j += 1;
        word += text[j];
      }
      if (j >= text.length) throw new Error('unterminated quote');
      inWord = true;
      i = j + 1;
    } else if (c === '\\' && i + 1 < text.length) {
      word += text[i + 1];
      inWord = true;
      i += 2;
    } else {
      const separator = SEPARATORS.find((s) => text.startsWith(s, i));
      if (separator) {
        endCommand(separator);
        i += separator.length;
      } else if (c === ' ' || c === '\t') {
        endWord();
        i += 1;
      } else {
        word += c;
        inWord = true;
        i += 1;
      }
    }
  }
  endCommand(null);
  return commands;
}

// Words that run the command after them: prefixes, and the shell's reserved and grouping words.
const PREFIXES = new Set([
  ...['env', 'command', 'time', 'exec', 'nohup', 'sudo'],
  ...['if', 'then', 'else', 'elif', 'do', 'while', 'until', '!', '{'],
]);
const GIT_OPTION_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace']);
const base = (word) => word.slice(word.lastIndexOf('/') + 1);

/** The command's name and arguments, past VAR=value, prefix words, and xargs with its options. */
function program(words) {
  let i = 0;
  for (;;) {
    if (i < words.length && (/^\w+=/.test(words[i]) || PREFIXES.has(words[i]))) i += 1;
    else if (words[i] === 'xargs') {
      i += 1;
      while (i < words.length && words[i].startsWith('-')) i += 1;
    } else break;
  }
  return { name: base(words[i] ?? ''), args: words.slice(i + 1) };
}

/** For git: the subcommand and its arguments, past the global options. */
function gitCommand(args) {
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) {
    i += GIT_OPTION_WITH_VALUE.has(args[i]) ? 2 : 1;
  }
  return { sub: args[i] ?? '', rest: args.slice(i + 1) };
}

const shortFlag = (args, letter) =>
  args.some((arg) => /^-[a-zA-Z]+$/.test(arg) && arg.includes(letter));

const REASONS = {
  add: 'stage files by path (git add <path> or --pathspec-from-file), never all at once',
  verify: 'never skip the checks with --no-verify (or git commit -n)',
  join: 'join a check and the commit or push after it with &&, not ; || & or a new line',
  kill: 'stop only your own server, by its PID (lsof -iTCP:<port>), never by name',
};

/** The reason to refuse one simple command, or null. */
function checkCommand({ words, after }, depth, seen) {
  const { name, args } = program(words);
  if (name === 'pkill' || name === 'killall') return REASONS.kill;
  const shell =
    ['bash', 'sh', 'zsh'].includes(name) && /^-[a-zA-Z]*c[a-zA-Z]*$/.test(args[0] ?? '');
  if ((shell && args[1]) || (name === 'eval' && args.length > 0)) {
    return depth < 3
      ? checkText(shell ? args[1] : args.join(' '), depth + 1, seen)
      : 'bash -c too deeply nested to read; refusing it';
  }
  if (name !== 'git') return null;
  const { sub, rest } = gitCommand(args);
  seen.add(sub);
  if (
    sub === 'add' &&
    (rest.some((a) => ['--all', '.', './'].includes(a)) || shortFlag(rest, 'A'))
  ) {
    return REASONS.add;
  }
  if (sub === 'commit' && (rest.includes('--no-verify') || shortFlag(rest, 'n'))) {
    return REASONS.verify;
  }
  if (sub === 'push' && rest.includes('--no-verify')) return REASONS.verify;
  if ((sub === 'commit' || sub === 'push') && [';', '||', '&', '\n'].includes(after)) {
    return REASONS.join;
  }
  return null;
}

function checkText(text, depth, seen) {
  for (const command of split(text)) {
    const reason = checkCommand(command, depth, seen);
    if (reason) return reason;
  }
  return null;
}

// The raw-text fallback (gate-design.md): git (with only options between) and a guarded
// subcommand, or a by-name kill, anywhere in the text.
const RAW_GIT = /\bgit(?:\s+-[Cc]\s+\S+|\s+-\S+)*\s+(add|commit|push)\b/g;
const RAW_KILL = /\b(?:pkill|killall)\b/;

/** The reason to refuse `command`, or null. A command it cannot parse is refused. */
export function check(command) {
  try {
    const seen = new Set();
    const reason = checkText(command, 0, seen);
    if (reason) return reason;
    const unresolved = [...command.matchAll(RAW_GIT)].find((match) => !seen.has(match[1]));
    if (unresolved) {
      return `found "git ${unresolved[1]}" in text the hook could not resolve as a command; refusing it`;
    }
    if (RAW_KILL.test(command)) {
      return 'found pkill or killall in text the hook could not resolve as a command; refusing it';
    }
    return null;
  } catch (error) {
    return `could not parse the command (${error.message}); refusing it`;
  }
}

/** `input` is the hook's stdin (JSON); returns the exit code (2 refuses, and Claude reads why). */
export function main(input, err = (line) => process.stderr.write(`${line}\n`)) {
  let command;
  try {
    command = JSON.parse(input).tool_input?.command;
  } catch {
    command = undefined;
  }
  const reason =
    typeof command === 'string' ? check(command) : 'could not read the command; refusing it';
  if (reason === null) return 0;
  err(`guard-bash: ${reason}`);
  return 2;
}
