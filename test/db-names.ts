export const TEMPLATE = 'xmodoki_test';

export const workerDatabaseName = (id: number | string) => `${TEMPLATE}_${id}`;

/** The same connection string pointing at another database. */
export function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}
