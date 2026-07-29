/**
 * Care tasks (chăm sóc) — the Kanban board. Branch is derived from the customer.
 * Unassigned tasks sit in the branch pool; staff claim them. All roles read
 * (branch-scoped); admin + staff write/claim; delete is admin. Accountants don't
 * run customer care, so they can't create or mutate tasks.
 */

import type { RepositoryBundle } from '@firecare/types';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../lib/errors';
import { branchScopeFor, guard, requirePrincipal } from '../lib/principal';
import { created, noContent, ok, paginated } from '../lib/responses';
import { careTaskQuerySchema, createCareTaskSchema, updateCareTaskSchema } from '../schemas';

export function registerCareTaskRoutes(app: FastifyInstance, repos: RepositoryBundle): void {
  app.get('/api/care-tasks', async (req, reply) => {
    const principal = requirePrincipal(req);
    const q = careTaskQuerySchema.parse(req.query);
    const result = await repos.careTasks.list({ ...q, scope: branchScopeFor(principal) });
    return paginated(reply, result.items, { page: q.page, pageSize: q.pageSize, total: result.total });
  });

  app.get('/api/care-tasks/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    const { id } = req.params as { id: string };
    const task = await repos.careTasks.findById(id, branchScopeFor(principal));
    if (!task) throw AppError.notFound();
    return ok(reply, task);
  });

  app.post('/api/care-tasks', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { customerId, ...body } = createCareTaskSchema.parse(req.body);
    const scope = branchScopeFor(principal);
    const customer = await repos.customers.findById(customerId, scope);
    if (!customer) throw AppError.of('VALIDATION_ERROR', 'Khách hàng không tồn tại');
    const task = await repos.careTasks.create({
      ...body,
      customerId: customer.id,
      branchId: customer.branchId,
      createdById: principal.userId,
    });
    return created(reply, task, `/api/care-tasks/${task.id}`);
  });

  // Drag-drop persists here (status + position); also edits, reassigns, notes.
  app.patch('/api/care-tasks/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { id } = req.params as { id: string };
    const task = await repos.careTasks.update(
      id,
      updateCareTaskSchema.parse(req.body),
      branchScopeFor(principal),
    );
    if (!task) throw AppError.notFound();
    return ok(reply, task);
  });

  // Take a pooled task. Fails 409 if someone already claimed it.
  app.post('/api/care-tasks/:id/claim', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { id } = req.params as { id: string };
    const scope = branchScopeFor(principal);
    const task = await repos.careTasks.claim(id, principal.userId, scope);
    if (task) return ok(reply, task);
    // Distinguish "already taken" from "not found" for a clearer message.
    const exists = await repos.careTasks.findById(id, scope);
    if (exists) throw AppError.of('CONFLICT', 'Thẻ đã được người khác nhận');
    throw AppError.notFound();
  });

  // Return a task to the branch pool.
  app.post('/api/care-tasks/:id/release', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { id } = req.params as { id: string };
    const task = await repos.careTasks.release(id, branchScopeFor(principal));
    if (!task) throw AppError.notFound();
    return ok(reply, task);
  });

  app.delete('/api/care-tasks/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin']);
    const { id } = req.params as { id: string };
    if (!(await repos.careTasks.delete(id, branchScopeFor(principal)))) throw AppError.notFound();
    return noContent(reply);
  });
}
