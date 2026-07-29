/**
 * Faults & repairs (sự cố). Branch/site/customer are derived from the asset.
 * Logging a fault marks the asset faulty; resolving the last open fault returns
 * the asset to active. All roles read (branch-scoped); admin + staff write;
 * delete is admin.
 */

import type { RepositoryBundle } from '@firecare/types';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../lib/errors';
import { branchScopeFor, guard, requirePrincipal } from '../lib/principal';
import { created, noContent, ok, paginated } from '../lib/responses';
import { createFaultSchema, faultQuerySchema, resolveFaultSchema, updateFaultSchema } from '../schemas';

const today = () => new Date().toISOString().slice(0, 10);

export function registerFaultRoutes(app: FastifyInstance, repos: RepositoryBundle): void {
  app.get('/api/faults', async (req, reply) => {
    const principal = requirePrincipal(req);
    const q = faultQuerySchema.parse(req.query);
    const result = await repos.faults.list({ ...q, scope: branchScopeFor(principal) });
    return paginated(reply, result.items, { page: q.page, pageSize: q.pageSize, total: result.total });
  });

  app.get('/api/faults/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    const { id } = req.params as { id: string };
    const fault = await repos.faults.findById(id, branchScopeFor(principal));
    if (!fault) throw AppError.notFound();
    return ok(reply, fault);
  });

  app.post('/api/faults', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { assetId, ...body } = createFaultSchema.parse(req.body);
    const scope = branchScopeFor(principal);
    const asset = await repos.assets.findById(assetId, scope);
    if (!asset) throw AppError.of('VALIDATION_ERROR', 'Thiết bị không tồn tại');
    const fault = await repos.faults.create({
      ...body,
      assetId: asset.id,
      branchId: asset.branchId,
      siteId: asset.siteId,
      customerId: asset.customerId,
      createdById: principal.userId,
    });
    await repos.assets.update(asset.id, { status: 'faulty' }, scope);
    return created(reply, fault, `/api/faults/${fault.id}`);
  });

  app.patch('/api/faults/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { id } = req.params as { id: string };
    const fault = await repos.faults.update(
      id,
      updateFaultSchema.parse(req.body),
      branchScopeFor(principal),
    );
    if (!fault) throw AppError.notFound();
    return ok(reply, fault);
  });

  app.post('/api/faults/:id/resolve', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { id } = req.params as { id: string };
    const scope = branchScopeFor(principal);
    const existing = await repos.faults.findById(id, scope);
    if (!existing) throw AppError.notFound();
    const body = resolveFaultSchema.parse(req.body);
    const fault = await repos.faults.resolve(
      id,
      { resolvedAt: body.resolvedDate ?? today(), resolutionNote: body.resolutionNote ?? null },
      scope,
    );

    // Return the asset to active only when it has no remaining open/in-repair faults.
    const open = await repos.faults.list({
      page: 1,
      pageSize: 1,
      scope,
      assetId: existing.assetId,
      status: 'open',
    });
    const inRepair = await repos.faults.list({
      page: 1,
      pageSize: 1,
      scope,
      assetId: existing.assetId,
      status: 'in_repair',
    });
    if (open.total === 0 && inRepair.total === 0) {
      await repos.assets.update(existing.assetId, { status: 'active' }, scope);
    }
    return ok(reply, fault);
  });

  app.delete('/api/faults/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin']);
    const { id } = req.params as { id: string };
    if (!(await repos.faults.delete(id, branchScopeFor(principal)))) throw AppError.notFound();
    return noContent(reply);
  });
}
