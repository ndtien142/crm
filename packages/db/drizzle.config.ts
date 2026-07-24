import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Reuse the server's env so DATABASE_URL has a single source of truth.
loadEnv({ path: '../../apps/server/.env' });

export default defineConfig({
  schema: './src/schema.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  casing: 'snake_case',
  schemaFilter: ['public'],
});
