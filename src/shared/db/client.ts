import 'server-only';
import { drizzle } from 'drizzle-orm/node-postgres';
import { after } from 'next/server';
import { Pool } from 'pg';
import { cache } from 'react';
import { env } from '@/shared/config/env';
import * as schema from './schema';

/**
 * One connection pool per request (ADR-0017): nothing is opened at module load, the pool is shared
 * within the request through React's cache(), and it is closed after the response.
 */
export const getDb = cache(() => {
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 2 });
  after(() => pool.end());
  return drizzle(pool, { schema });
});
