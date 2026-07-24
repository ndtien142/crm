import type { FastifyInstance } from 'fastify';

/** Liveness probe. Exempt from auth and rate-limit. */
export function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/health', async () => ({ status: 'ok' }));
}
