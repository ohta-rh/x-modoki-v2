// node scripts/check-authz.mjs: every entry's authorization is checked by a tagged test (#33).
import { main } from './lib/check-authz.mjs';

process.exitCode = main(process.argv.slice(2));
