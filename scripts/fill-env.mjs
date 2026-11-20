import { main } from './lib/fill-env.mjs';

process.exitCode = main(process.argv.slice(2));
