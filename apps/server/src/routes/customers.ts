/**
 * Customers. All roles read (branch-scoped); admin + staff write; accountant is
 * read-only; delete is admin-only. Branch is derived from the principal for
 * staff and validated for admin — never trusted blindly.
 */

import type { NewCustomer, RepositoryBundle } from '@firecare/types';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../lib/errors';
import { branchScopeFor, guard, requirePrincipal, resolveWriteBranchId } from '../lib/principal';
import { created, noContent, ok, paginated } from '../lib/responses';
import {
  createCustomerSchema,
  customerImportSchema,
  customerQuerySchema,
  updateCustomerSchema,
} from '../schemas';

export function registerCustomerRoutes(app: FastifyInstance, repos: RepositoryBundle): void {
  app.get('/api/customers', async (req, reply) => {
    const principal = requirePrincipal(req);
    const q = customerQuerySchema.parse(req.query);
    const result = await repos.customers.list({ ...q, scope: branchScopeFor(principal) });
    return paginated(reply, result.items, { page: q.page, pageSize: q.pageSize, total: result.total });
  });

  app.get('/api/customers/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    const { id } = req.params as { id: string };
    const customer = await repos.customers.findById(id, branchScopeFor(principal));
    if (!customer) throw AppError.notFound();
    return ok(reply, customer);
  });

  app.post('/api/customers', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { branchId: requested, ...body } = createCustomerSchema.parse(req.body);
    const branchId = await resolveWriteBranchId(principal, requested, repos);
    const customer = await repos.customers.create({
      ...body,
      branchId,
      createdById: principal.userId,
    });
    return created(reply, customer, `/api/customers/${customer.id}`);
  });

  app.patch('/api/customers/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { id } = req.params as { id: string };
    const patch = updateCustomerSchema.parse(req.body);
    const customer = await repos.customers.update(id, patch, branchScopeFor(principal));
    if (!customer) throw AppError.notFound();
    return ok(reply, customer);
  });

  app.delete('/api/customers/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin']);
    const { id } = req.params as { id: string };
    const removed = await repos.customers.delete(id, branchScopeFor(principal));
    if (!removed) throw AppError.notFound();
    return noContent(reply);
  });

  app.post('/api/customers/import', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { branchId: requested, rows } = customerImportSchema.parse(req.body);
    const branchId = await resolveWriteBranchId(principal, requested, repos);
    const mapped: NewCustomer[] = rows.map((r) => ({
      branchId,
      name: r.name,
      phone: r.phone ?? null,
      type: r.type ?? 'individual',
      email: r.email ?? null,
      address: r.address ?? null,
      taxCode: r.taxCode ?? null,
      tags: r.tags ?? [],
      source: 'import',
      createdById: principal.userId,
    }));
    const report = await repos.customers.bulkCreate(branchId, mapped);
    return ok(reply, report);
  });
}
