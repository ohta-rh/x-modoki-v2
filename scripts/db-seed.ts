// `pnpm db:seed`: fills the DATABASE_URL database with fictional data. The script entry passes
// --env-file-if-exists=.env.local, as Next.js reads that file.
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../src/shared/db/schema/index.ts';
import { seed } from './seed.ts';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  await seed(drizzle(pool, { schema }));
  process.exitCode = 0;
} finally {
  await pool.end();
}
