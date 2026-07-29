/**
 * Sites (địa điểm / tòa nhà của khách). A site inherits its branch from its
 * customer. All roles read (branch-scoped); admin + staff write; delete is admin.
 */

import type { RepositoryBundle } from '@firecare/types';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../lib/errors';
import { branchScopeFor, guard, requirePrincipal } from '../lib/principal';
import { created, noContent, ok, paginated } from '../lib/responses';
import { createSiteSchema, siteQuerySchema, updateSiteSchema } from '../schemas';

export function registerSiteRoutes(app: FastifyInstance, repos: RepositoryBundle): void {
  app.get('/api/sites', async (req, reply) => {
    const principal = requirePrincipal(req);
    const q = siteQuerySchema.parse(req.query);
    const result = await repos.sites.list({ ...q, scope: branchScopeFor(principal) });
    return paginated(reply, result.items, { page: q.page, pageSize: q.pageSize, total: result.total });
  });

  app.get('/api/sites/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    const { id } = req.params as { id: string };
    const site = await repos.sites.findById(id, branchScopeFor(principal));
    if (!site) throw AppError.notFound();
    return ok(reply, site);
  });

  app.post('/api/sites', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { customerId, ...body } = createSiteSchema.parse(req.body);
    // The site inherits branch + ownership from the customer (scoped lookup).
    const customer = await repos.customers.findById(customerId, branchScopeFor(principal));
    if (!customer) throw AppError.of('VALIDATION_ERROR', 'Khách hàng không tồn tại');
    const site = await repos.sites.create({
      ...body,
      branchId: customer.branchId,
      customerId: customer.id,
      createdById: principal.userId,
    });
    return created(reply, site, `/api/sites/${site.id}`);
  });

  app.patch('/api/sites/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { id } = req.params as { id: string };
    const patch = updateSiteSchema.parse(req.body);
    const site = await repos.sites.update(id, patch, branchScopeFor(principal));
    if (!site) throw AppError.notFound();
    return ok(reply, site);
  });

  app.delete('/api/sites/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin']);
    const { id } = req.params as { id: string };
    const removed = await repos.sites.delete(id, branchScopeFor(principal));
    if (!removed) throw AppError.notFound();
    return noContent(reply);
  });
}
