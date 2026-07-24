/** Branches — everyone reads (for scoping context); admin manages. */

import type { RepositoryBundle } from '@firecare/types';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../lib/errors';
import { guard, requirePrincipal } from '../lib/principal';
import { created, ok, paginated } from '../lib/responses';
import { branchQuerySchema, createBranchSchema, updateBranchSchema } from '../schemas';

export function registerBranchRoutes(app: FastifyInstance, repos: RepositoryBundle): void {
  app.get('/api/branches', async (req, reply) => {
    requirePrincipal(req);
    const { page, pageSize, q, includeInactive } = branchQuerySchema.parse(req.query);
    const result = await repos.branches.list({ page, pageSize, q, includeInactive });
    return paginated(reply, result.items, { page, pageSize, total: result.total });
  });

  app.get('/api/branches/:id', async (req, reply) => {
    requirePrincipal(req);
    const { id } = req.params as { id: string };
    const branch = await repos.branches.findById(id);
    if (!branch) throw AppError.notFound();
    return ok(reply, branch);
  });

  app.post('/api/branches', async (req, reply) => {
    guard(requirePrincipal(req), ['admin']);
    const body = createBranchSchema.parse(req.body);
    if (await repos.branches.findByCode(body.code)) {
      throw AppError.of('DUPLICATE_RESOURCE', 'Mã chi nhánh đã tồn tại');
    }
    const branch = await repos.branches.create(body);
    return created(reply, branch, `/api/branches/${branch.id}`);
  });

  app.patch('/api/branches/:id', async (req, reply) => {
    guard(requirePrincipal(req), ['admin']);
    const { id } = req.params as { id: string };
    const { isActive, ...patch } = updateBranchSchema.parse(req.body);
    let branch = await repos.branches.update(id, patch);
    if (branch && isActive !== undefined) branch = await repos.branches.setActive(id, isActive);
    if (!branch) throw AppError.notFound();
    return ok(reply, branch);
  });
}
