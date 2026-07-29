/**
 * Composition root: build the Fastify instance, pick the repository bundle
 * (Postgres when DATABASE_URL is set, otherwise the in-memory mock), wire
 * cross-cutting middleware, and register the resource routes.
 */

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { createMockRepositories } from '@firecare/core';
import { createDrizzleRepositories, db } from '@firecare/db';
import type { RepositoryBundle } from '@firecare/types';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from './config';
import { registerErrorHandling } from './lib/errors';
import { installPrincipal } from './lib/principal';
import { createTokenService } from './lib/tokens';
import { registerAssetRoutes } from './routes/assets';
import { registerAuthRoutes } from './routes/auth';
import { registerBranchRoutes } from './routes/branches';
import { registerCustomerRoutes } from './routes/customers';
import { registerHealthRoutes } from './routes/health';
import { registerSiteRoutes } from './routes/sites';
import { registerUserRoutes } from './routes/users';

/** `deps.repos` lets tests inject a seeded in-memory bundle (no DB, no network). */
export async function buildApp(
  config: AppConfig,
  deps?: { repos?: RepositoryBundle },
): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.logLevel } });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: config.corsOrigins, credentials: true });
  await app.register(cookie);
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

  const repos: RepositoryBundle =
    deps?.repos ?? (config.databaseUrl ? createDrizzleRepositories(db) : createMockRepositories());
  const tokens = createTokenService(config.jwt.secret, {
    accessTtlSeconds: config.jwt.accessTtlSeconds,
  });

  registerErrorHandling(app, config.isProduction);
  installPrincipal(app, repos, tokens.verifyAccessToken);

  registerHealthRoutes(app);
  registerAuthRoutes(app, repos, tokens, {
    refreshTtlDays: config.jwt.refreshTtlDays,
    isProduction: config.isProduction,
  });
  registerUserRoutes(app, repos);
  registerBranchRoutes(app, repos);
  registerCustomerRoutes(app, repos);
  registerSiteRoutes(app, repos);
  registerAssetRoutes(app, repos);

  return app;
}
