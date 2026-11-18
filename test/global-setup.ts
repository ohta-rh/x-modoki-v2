// Vitest global setup (ADR-0031): rebuild the template database from the migrations, then copy it
// once per possible worker. Copies are made here, one at a time, because PostgreSQL refuses to copy
// a template that another CREATE DATABASE is reading.
import { availableParallelism } from 'node:os';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client, Pool } from 'pg';
import { TEMPLATE, workerDatabaseName, withDatabase } from './db-names';

export default async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set: run `sh scripts/setup-local.sh` first');
  const workers = Array.from({ length: availableParallelism() }, (_, i) => i + 1);

  const admin = new Client({ connectionString: url });
  await admin.connect();
  try {
    for (const name of [...workers.map(workerDatabaseName), TEMPLATE]) {
      await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    }
    await admin.query(`CREATE DATABASE "${TEMPLATE}"`);
    const pool = new Pool({ connectionString: withDatabase(url, TEMPLATE), max: 1 });
    await migrate(drizzle(pool), { migrationsFolder: 'drizzle' });
    await pool.end();
    for (const id of workers) {
      await admin.query(`CREATE DATABASE "${workerDatabaseName(id)}" TEMPLATE "${TEMPLATE}"`);
    }
  } finally {
    await admin.end();
  }
}
