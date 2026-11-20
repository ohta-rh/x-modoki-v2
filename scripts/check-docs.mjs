import { main } from './lib/check-docs.mjs';

process.exitCode = main(process.argv.slice(2));
