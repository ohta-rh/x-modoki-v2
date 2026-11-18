import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from './lib/check-traceability.mjs';

process.exitCode = main(['--root', join(dirname(fileURLToPath(import.meta.url)), '..')]);
