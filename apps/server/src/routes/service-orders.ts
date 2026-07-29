/**
 * Service orders (phiếu dịch vụ). Branch is derived from the customer. Multi-line
 * orders; completing rolls each line's due date + the order's nextDueDate (feeds
 * the re-service reminder). Payment is accountant/admin; the rest is admin/staff.
 */

import type { RepositoryBundle } from '@firecare/types';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../lib/errors';
import { branchScopeFor, guard, requirePrincipal } from '../lib/principal';
import { created, noContent, ok, paginated } from '../lib/responses';
import {
  completeServiceOrderSchema,
  createServiceOrderSchema,
  paymentServiceOrderSchema,
  serviceOrderQuerySchema,
  updateServiceOrderSchema,
} from '../schemas';

const today = () => new Date().toISOString().slice(0, 10);

export function registerServiceOrderRoutes(app: FastifyInstance, repos: RepositoryBundle): void {
  app.get('/api/service-orders', async (req, reply) => {
    const principal = requirePrincipal(req);
    const q = serviceOrderQuerySchema.parse(req.query);
    const result = await repos.serviceOrders.list({ ...q, scope: branchScopeFor(principal) });
    return paginated(reply, result.items, { page: q.page, pageSize: q.pageSize, total: result.total });
  });

  app.get('/api/service-orders/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    const { id } = req.params as { id: string };
    const order = await repos.serviceOrders.findById(id, branchScopeFor(principal));
    if (!order) throw AppError.notFound();
    return ok(reply, order);
  });

  app.post('/api/service-orders', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { customerId, lines, ...body } = createServiceOrderSchema.parse(req.body);
    const customer = await repos.customers.findById(customerId, branchScopeFor(principal));
    if (!customer) throw AppError.of('VALIDATION_ERROR', 'Khách hàng không tồn tại');
    const order = await repos.serviceOrders.create(
      { ...body, customerId: customer.id, branchId: customer.branchId, createdById: principal.userId },
      lines,
    );
    return created(reply, order, `/api/service-orders/${order.id}`);
  });

  app.patch('/api/service-orders/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { id } = req.params as { id: string };
    const order = await repos.serviceOrders.update(
      id,
      updateServiceOrderSchema.parse(req.body),
      branchScopeFor(principal),
    );
    if (!order) throw AppError.notFound();
    return ok(reply, order);
  });

  app.post('/api/service-orders/:id/complete', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { id } = req.params as { id: string };
    const body = completeServiceOrderSchema.parse(req.body);
    const order = await repos.serviceOrders.complete(
      id,
      { performedAt: body.performedAt ?? today(), performedById: body.performedById ?? principal.userId },
      branchScopeFor(principal),
    );
    if (!order) throw AppError.notFound();
    return ok(reply, order);
  });

  // Payment is the accountant's job (staff cannot touch money).
  app.post('/api/service-orders/:id/payment', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'accountant']);
    const { id } = req.params as { id: string };
    const order = await repos.serviceOrders.setPayment(
      id,
      paymentServiceOrderSchema.parse(req.body),
      branchScopeFor(principal),
    );
    if (!order) throw AppError.notFound();
    return ok(reply, order);
  });

  app.delete('/api/service-orders/:id', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin']);
    const { id } = req.params as { id: string };
    if (!(await repos.serviceOrders.delete(id, branchScopeFor(principal)))) throw AppError.notFound();
    return noContent(reply);
  });
}
