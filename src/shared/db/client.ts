import 'server-only';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { cache } from 'react';
import { env } from '@/shared/config';
import * as schema from './schema';

/**
 * One connection pool per request (ADR-0017): nothing is opened at module load and the pool is
 * shared within the request through React's cache(). It is never ended explicitly: an idle
 * connection closes itself after a second (ADR-0037), so nothing can use a pool that was ended
 * while the same request is still running.
 */
export const getDb = cache(() => {
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 2, idleTimeoutMillis: 1_000 });
  return drizzle(pool, { schema });
});

/** A transaction inside getDb(): what a mutation passes to a shared write (e.g. a notification). */
export type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];
