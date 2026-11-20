// node scripts/perf.mjs --base http://localhost:3300 [--cookie '<Cookie header>'] /home /{username} …
// Lighthouse's mobile run of each page against the budget (#32, NFR-PERF-01 to 03); exit 1 if over.
import { main } from './lib/perf.mjs';

process.exitCode = await main(process.argv.slice(2));
