/** Service catalog (danh mục dịch vụ) — company-wide; admin manages, all read. */

import type { RepositoryBundle } from '@firecare/types';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../lib/errors';
import { guard, requirePrincipal } from '../lib/principal';
import { created, noContent, ok } from '../lib/responses';
import {
  createServiceCatalogSchema,
  serviceCatalogQuerySchema,
  updateServiceCatalogSchema,
} from '../schemas';

export function registerServiceCatalogRoutes(app: FastifyInstance, repos: RepositoryBundle): void {
  app.get('/api/service-catalog', async (req, reply) => {
    requirePrincipal(req);
    const q = serviceCatalogQuerySchema.parse(req.query);
    return ok(reply, await repos.serviceCatalog.list(q));
  });

  app.post('/api/service-catalog', async (req, reply) => {
    guard(requirePrincipal(req), ['admin']);
    const item = await repos.serviceCatalog.create(createServiceCatalogSchema.parse(req.body));
    return created(reply, item, `/api/service-catalog/${item.id}`);
  });

  app.patch('/api/service-catalog/:id', async (req, reply) => {
    guard(requirePrincipal(req), ['admin']);
    const { id } = req.params as { id: string };
    const item = await repos.serviceCatalog.update(id, updateServiceCatalogSchema.parse(req.body));
    if (!item) throw AppError.notFound();
    return ok(reply, item);
  });

  app.delete('/api/service-catalog/:id', async (req, reply) => {
    guard(requirePrincipal(req), ['admin']);
    const { id } = req.params as { id: string };
    if (!(await repos.serviceCatalog.delete(id))) throw AppError.notFound();
    return noContent(reply);
  });
}
