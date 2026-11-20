// The guide's commands, read from the guide itself: CI runs them on a fresh clone, so the guide
// cannot drift from what works (#35, ADR-0069).
import { readFileSync } from 'node:fs';

const USAGE = 'usage: node scripts/guide-commands.mjs <guide.md> "<section heading>"';

/** The first ```sh block under `## <heading>`, before the next `## `; null if there is none. */
export function guideCommands(markdown, heading) {
  const start = markdown.indexOf(`\n## ${heading}\n`);
  if (start < 0) return null;
  const rest = markdown.slice(start + 1);
  const next = rest.indexOf('\n## ');
  const section = next < 0 ? rest : rest.slice(0, next);
  const block = /\n```sh\n([\s\S]*?)```/.exec(section);
  return block ? block[1] : null;
}

export function main(argv, log = console, write = (text) => process.stdout.write(text)) {
  const [path, heading] = argv;
  if (!path || !heading) {
    log.error(USAGE);
    return 1;
  }
  const commands = guideCommands(readFileSync(path, 'utf8'), heading);
  if (commands === null) {
    log.error(`guide-commands: no sh block under "## ${heading}" in ${path}`);
    return 1;
  }
  write(commands);
  return 0;
}
