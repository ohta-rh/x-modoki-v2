import { readFileSync } from 'node:fs';
import { main } from './lib/format-edited.mjs';

process.exitCode = main(readFileSync(0, 'utf8'));
