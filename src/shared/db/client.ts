import 'server-only';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { cache } from 'react';
import { env } from '@/shared/config';
import * as schema from './schema';

/**
 * One connection pool per request (ADR-0017): nothing is opened at module load and the pool is
 * shared within the request through React's cache(). It is never ended explicitly (ADR-0037): an
 * idle connection closes itself after 100ms (ADR-0050). Kept longer, connections pile up with the
 * request rate and run PostgreSQL out of connections (#59).
 */
export const getDb = cache(() => {
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 2, idleTimeoutMillis: 100 });
  return drizzle(pool, { schema });
});

/** A transaction inside getDb(): what a mutation passes to a shared write (e.g. a notification). */
export type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];
