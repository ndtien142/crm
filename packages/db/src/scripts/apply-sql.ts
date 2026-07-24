/** Applies sql/postgis.sql (extensions, generated columns, indexes). Idempotent. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import pg from 'pg';

loadEnv({ path: '../../apps/server/.env' });

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, '..', 'sql', 'postgis.sql'), 'utf8');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(sql);
await pool.end();
console.log('[db:extras] applied sql/postgis.sql');
