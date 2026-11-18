import { main } from './lib/check-src-layers.mjs';

process.exitCode = main(process.argv.slice(2));
