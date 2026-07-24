import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

/** Shared Postgres pool + Drizzle client. `DATABASE_URL` points at the local
 * Postgres (docker compose, port 55432) in dev or the managed DB in production. */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX ?? 5),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err);
});

export const db = drizzle(pool, { schema, casing: 'snake_case' });
export type Db = typeof db;

export { pool };
export * from './schema';
export { createDrizzleRepositories } from './factory';
