// Load .env before anything reads process.env (incl. @firecare/db's pool).
import 'dotenv/config';
import { buildApp } from './app';
import { loadConfig } from './config';

const config = loadConfig();
if (!config.jwt.secret) {
  throw new Error('JWT_SECRET is required — set it in apps/server/.env');
}

const app = await buildApp(config);
try {
  await app.listen({ port: config.port, host: config.host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
