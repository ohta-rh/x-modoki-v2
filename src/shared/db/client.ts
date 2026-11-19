import 'server-only';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import { cache } from 'react';
import { env } from '@/shared/config';
import * as schema from './schema';

/**
 * One connection pool per request (ADR-0017): nothing is opened at module load and the pool is
 * shared within the request through React's cache(). It is never ended explicitly (ADR-0037): an
 * idle connection closes itself after 100ms (ADR-0050). Kept longer, connections pile up with the
 * request rate and run PostgreSQL out of connections (#59).
 */
const CONNECT_TIMEOUT_MS = 1_500;
const timedOut = (error: unknown) => error instanceof Error && /timeout/i.test(error.message);

/**
 * A pool whose new connections give up after 1.5s and are tried once more (#55, ADR-0057). Under a
 * burst of new connections a connect can stall for seconds (a dropped SYN, sent again after 1, 2,
 * 4… seconds); with no limit the request waited with it, once for 77s. Most stalls are the first
 * 1s resend, so the second try nearly always gets through; if not, the query fails instead of hanging.
 * The limit also bounds the wait for a free client when both are busy: a third query fails after
 * about 3s instead of waiting for one (review 1).
 */
class StallSafePool extends Pool {
  connect(): Promise<PoolClient>;
  connect(callback: ConnectCallback): void;
  connect(callback?: ConnectCallback): Promise<PoolClient> | void {
    if (!callback) {
      return super.connect().catch((error: unknown) => {
        if (timedOut(error)) return super.connect();
        throw error;
      });
    }
    super.connect((error, client, done) => {
      if (error && timedOut(error)) return super.connect(callback);
      callback(error, client, done);
    });
  }
}

type ConnectCallback = (
  error: Error | undefined,
  client: PoolClient | undefined,
  done: (release?: unknown) => void,
) => void;

export function newPool(connectionString: string) {
  return new StallSafePool({
    connectionString,
    max: 2,
    idleTimeoutMillis: 100,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
  });
}

export const getDb = cache(() => drizzle(newPool(env.DATABASE_URL), { schema }));

/** A transaction inside getDb(): what a mutation passes to a shared write (e.g. a notification). */
export type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];
