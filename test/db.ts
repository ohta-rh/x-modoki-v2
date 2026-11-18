// The worker's own test database (ADR-0031). test/setup.ts routes getDb() here, so data access
// code runs unchanged against a real PostgreSQL; setupTestDb() empties every table before each test.
import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, beforeEach } from 'vitest';
import * as schema from '@/shared/db/schema';
import { workerDatabaseName, withDatabase } from './db-names';

export type TestDb = NodePgDatabase<typeof schema>;

let pool: Pool | undefined;
let db: TestDb | undefined;

export function testDb(): TestDb {
  if (!db) {
    const name = workerDatabaseName(process.env.VITEST_POOL_ID ?? '1');
    pool = new Pool({ connectionString: withDatabase(process.env.DATABASE_URL!, name), max: 4 });
    db = drizzle(pool, { schema });
  }
  return db;
}

export async function closeTestDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
  db = undefined;
}

/** Empties every table in the public schema; Drizzle's own journal lives in the `drizzle` schema. */
export async function resetDb(): Promise<void> {
  const { rows } = await testDb().execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  if (rows.length === 0) return;
  const tables = rows.map((row) => `"public"."${row.tablename}"`).join(', ');
  await testDb().execute(sql.raw(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`));
}

/** Call once at the top of a test file that touches the database. */
export function setupTestDb(): void {
  beforeEach(resetDb);
  afterAll(closeTestDb);
}
