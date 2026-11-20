import { bigint, timestamp } from 'drizzle-orm/pg-core';

/** A 64-bit time-ordered ID (ADR-0016), read as a JavaScript bigint. */
export const id64 = (name: string) => bigint(name, { mode: 'bigint' });

/** A timestamptz read as a Date. */
export const at = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
