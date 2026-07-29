/**
 * Inspections (phiếu kiểm tra / kiểm định). Branch + customer are derived from
 * the site. Completing an inspection records the outcome and rolls the linked
 * asset's inspection dates + fault status.
 */

import type { RepositoryBundle } from '@firecare/types';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../lib/errors';
import { branchScopeFor, guard, requirePrincipal } from '../lib/principal';
import { created, noContent, ok, paginated } from '../lib/responses';
import {
  completeInspectionSchema,
  createInspectionSchema,
  inspectionQuerySchema,
  updateInspectionSchema,
} from '../schemas';

const today = () => new Date().toISOString().slice(0, 10);

export function registerInspectionRoutes(app: FastifyInstance, repos: RepositoryBundle): void {
  app.get('/api/inspections', async (req, reply) => {
    const principal = requirePrincipal(req);
    const q = inspectionQuerySchema.parse(req.query);
    const result = await repos.inspections.list({ ...q, scope: branchScopeFor(principal) });
    return paginated(reply, result.items, { page: q.page, pageSize: q.pageSize, total: result.total });
  });

  app.get('/api/inspections/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    const { id } = req.params as { id: string };
    const inspection = await repos.inspections.findById(id, branchScopeFor(principal));
    if (!inspection) throw AppError.notFound();
    return ok(reply, inspection);
  });

  app.post('/api/inspections', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { siteId, assetId, ...body } = createInspectionSchema.parse(req.body);
    const scope = branchScopeFor(principal);
    const site = await repos.sites.findById(siteId, scope);
    if (!site) throw AppError.of('VALIDATION_ERROR', 'Địa điểm không tồn tại');
    if (assetId) {
      const asset = await repos.assets.findById(assetId, scope);
      if (!asset || asset.siteId !== site.id) {
        throw AppError.of('VALIDATION_ERROR', 'Thiết bị không thuộc địa điểm');
      }
    }
    const inspection = await repos.inspections.create({
      ...body,
      siteId: site.id,
      assetId: assetId ?? null,
      branchId: site.branchId,
      customerId: site.customerId,
      createdById: principal.userId,
    });
    return created(reply, inspection, `/api/inspections/${inspection.id}`);
  });

  app.patch('/api/inspections/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { id } = req.params as { id: string };
    const inspection = await repos.inspections.update(
      id,
      updateInspectionSchema.parse(req.body),
      branchScopeFor(principal),
    );
    if (!inspection) throw AppError.notFound();
    return ok(reply, inspection);
  });

  app.post('/api/inspections/:id/complete', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { id } = req.params as { id: string };
    const scope = branchScopeFor(principal);
    const existing = await repos.inspections.findById(id, scope);
    if (!existing) throw AppError.notFound();
    const body = completeInspectionSchema.parse(req.body);
    const performedDate = body.performedDate ?? today();

    const inspection = await repos.inspections.update(
      id,
      {
        status: body.status,
        performedDate,
        result: body.result ?? existing.result,
        evidence: body.evidence ?? existing.evidence,
        nextDueDate: body.nextDueDate ?? existing.nextDueDate,
        notes: body.notes ?? existing.notes,
      },
      scope,
    );

    // Roll the asset's inspection dates + mark faulty when the check failed.
    if (existing.assetId) {
      await repos.assets.update(
        existing.assetId,
        {
          lastInspectedAt: performedDate,
          ...(body.nextDueDate ? { nextDueDate: body.nextDueDate } : {}),
          status: body.status === 'failed' ? 'faulty' : 'active',
        },
        scope,
      );
    }
    return ok(reply, inspection);
  });

  app.delete('/api/inspections/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin']);
    const { id } = req.params as { id: string };
    if (!(await repos.inspections.delete(id, branchScopeFor(principal)))) throw AppError.notFound();
    return noContent(reply);
  });
}
