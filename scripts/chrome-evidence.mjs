import { run } from './lib/chrome-evidence.mjs';

process.exitCode = await run(process.argv.slice(2));
