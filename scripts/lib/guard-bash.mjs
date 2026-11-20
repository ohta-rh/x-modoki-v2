// The PreToolUse hook for Bash (ADR-0074): refuses the commands that went wrong in Milestone 1,
// which a written rule did not stop. It reads the command text the way the shell would split it
// (separators, subshells, `bash -c` payloads, global git options, a path to git, VAR=value and env
// prefixes) and fails closed: input it cannot read is refused (~/.claude/rules/gate-design.md).

// git, possibly by path, with any global options before the subcommand.
const GIT = String.raw`(?:\S*\/)?git(?:\s+(?:-[Cc]\s+\S+|--[\w-]+=\S+|--(?:git-dir|work-tree|namespace|exec-path)\s+\S+|-p|-P|--no-pager|--bare))*`;
// Where a command starts: the beginning, a separator, a subshell, or a quote (bash -c '…').
const START = String.raw`(?:^|[\s;&|(\x60'"])`;
// A subcommand's arguments run to the next separator or quote.
const ARGS = String.raw`([^\n;&|)\x60'"]*)`;

const invocations = (command, sub) =>
  [...command.matchAll(new RegExp(`${START}${GIT}\\s+${sub}\\b${ARGS}`, 'g'))].map((m) =>
    m[1].trim().split(/\s+/).filter(Boolean),
  );
const shortFlags = (args, letter) =>
  args.some((arg) => /^-[a-zA-Z]+$/.test(arg) && arg.includes(letter));

const RULES = [
  [
    (c) =>
      invocations(c, 'add').some(
        (args) => args.some((a) => ['--all', '.', './'].includes(a)) || shortFlags(args, 'A'),
      ),
    'stage files by path (git add <path> or --pathspec-from-file), never all at once',
  ],
  [
    (c) =>
      invocations(c, 'commit').some(
        (args) => args.includes('--no-verify') || shortFlags(args, 'n'),
      ) || invocations(c, 'push').some((args) => args.includes('--no-verify')),
    'never skip the checks with --no-verify (or git commit -n)',
  ],
  [
    (c) =>
      new RegExp(
        String.raw`(?:;|\|\||\n)\s*(?:\w+=\S+\s+)*(?:env\s+)?${GIT}\s+(?:commit|push)\b`,
      ).test(c),
    'join a check and the commit or push after it with &&, not ; || or a new line',
  ],
  [
    (c) => /\b(?:pkill\s+-f|killall)\b/.test(c),
    'stop only your own server, by its PID (lsof -iTCP:<port>)',
  ],
];

/** The reason to refuse `command`, or null. */
export function check(command) {
  for (const [matches, reason] of RULES) if (matches(command)) return reason;
  return null;
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
