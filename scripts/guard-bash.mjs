import { readFileSync } from 'node:fs';
import { main } from './lib/guard-bash.mjs';

// Exit 1 does not block in Claude Code: any failure here refuses the command instead.
try {
  process.exitCode = main(readFileSync(0, 'utf8'));
} catch (error) {
  process.stderr.write(`guard-bash: ${error.message}; refusing the command\n`);
  process.exitCode = 2;
}
