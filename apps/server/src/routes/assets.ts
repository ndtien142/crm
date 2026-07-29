/**
 * Assets (thiết bị PCCC). Branch + customer are derived from the parent site.
 * All roles read (branch-scoped); admin + staff write; delete is admin. The QR
 * lookup underpins the later field-inspection flow (P7).
 */

import type { NewAsset, RepositoryBundle } from '@firecare/types';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../lib/errors';
import { branchScopeFor, guard, requirePrincipal } from '../lib/principal';
import { created, noContent, ok, paginated } from '../lib/responses';
import {
  assetImportSchema,
  assetQuerySchema,
  createAssetSchema,
  updateAssetSchema,
} from '../schemas';

export function registerAssetRoutes(app: FastifyInstance, repos: RepositoryBundle): void {
  app.get('/api/assets', async (req, reply) => {
    const principal = requirePrincipal(req);
    const q = assetQuerySchema.parse(req.query);
    const result = await repos.assets.list({ ...q, scope: branchScopeFor(principal) });
    return paginated(reply, result.items, { page: q.page, pageSize: q.pageSize, total: result.total });
  });

  app.get('/api/assets/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    const { id } = req.params as { id: string };
    const asset = await repos.assets.findById(id, branchScopeFor(principal));
    if (!asset) throw AppError.notFound();
    return ok(reply, asset);
  });

  // Scan-friendly lookup: GET /api/assets/qr/FC-XXXX
  app.get('/api/assets/qr/:code', async (req, reply) => {
    const principal = requirePrincipal(req);
    const { code } = req.params as { code: string };
    const asset = await repos.assets.findByQr(code, branchScopeFor(principal));
    if (!asset) throw AppError.notFound();
    return ok(reply, asset);
  });

  app.post('/api/assets', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { siteId, ...body } = createAssetSchema.parse(req.body);
    const scope = branchScopeFor(principal);
    const site = await repos.sites.findById(siteId, scope);
    if (!site) throw AppError.of('VALIDATION_ERROR', 'Địa điểm không tồn tại');
    if (body.qrCode && (await repos.assets.findByQr(body.qrCode, scope))) {
      throw AppError.of('DUPLICATE_RESOURCE', 'Mã QR đã tồn tại');
    }
    const asset = await repos.assets.create({
      ...body,
      siteId: site.id,
      branchId: site.branchId,
      customerId: site.customerId,
      createdById: principal.userId,
    });
    return created(reply, asset, `/api/assets/${asset.id}`);
  });

  app.patch('/api/assets/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { id } = req.params as { id: string };
    const patch = updateAssetSchema.parse(req.body);
    const asset = await repos.assets.update(id, patch, branchScopeFor(principal));
    if (!asset) throw AppError.notFound();
    return ok(reply, asset);
  });

  app.delete('/api/assets/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin']);
    const { id } = req.params as { id: string };
    const removed = await repos.assets.delete(id, branchScopeFor(principal));
    if (!removed) throw AppError.notFound();
    return noContent(reply);
  });

  app.post('/api/assets/import', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { siteId, rows } = assetImportSchema.parse(req.body);
    const site = await repos.sites.findById(siteId, branchScopeFor(principal));
    if (!site) throw AppError.of('VALIDATION_ERROR', 'Địa điểm không tồn tại');
    const mapped: NewAsset[] = rows.map((r) => ({
      branchId: site.branchId,
      siteId: site.id,
      customerId: site.customerId,
      category: r.category ?? 'extinguisher',
      name: r.name,
      serialNo: r.serialNo ?? null,
      manufacturer: r.manufacturer ?? null,
      capacity: r.capacity ?? null,
      manufactureDate: r.manufactureDate ?? null,
      nextDueDate: r.nextDueDate ?? null,
      locationNote: r.locationNote ?? null,
      createdById: principal.userId,
    }));
    const report = await repos.assets.bulkCreate(
      { branchId: site.branchId, siteId: site.id, customerId: site.customerId },
      mapped,
    );
    return ok(reply, report);
  });
}
