import { main } from './lib/guide-commands.mjs';

process.exitCode = main(process.argv.slice(2));
