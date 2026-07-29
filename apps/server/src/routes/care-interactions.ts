/**
 * Care interactions (nhật ký chăm sóc) — the ledger of every touch with a
 * customer. Branch is derived from the customer. Logging a touch nudges the
 * linked care task: a callback/no-answer carries the next-follow-up date onto
 * the task, and a refusal marks it lost (churn signal). Admin + staff write.
 */

import type { RepositoryBundle } from '@firecare/types';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../lib/errors';
import { branchScopeFor, guard, requirePrincipal } from '../lib/principal';
import { created, paginated } from '../lib/responses';
import { careInteractionQuerySchema, createCareInteractionSchema } from '../schemas';

export function registerCareInteractionRoutes(app: FastifyInstance, repos: RepositoryBundle): void {
  app.get('/api/care-interactions', async (req, reply) => {
    const principal = requirePrincipal(req);
    const q = careInteractionQuerySchema.parse(req.query);
    const result = await repos.careInteractions.list({ ...q, scope: branchScopeFor(principal) });
    return paginated(reply, result.items, { page: q.page, pageSize: q.pageSize, total: result.total });
  });

  app.post('/api/care-interactions', async (req, reply) => {
    const principal = requirePrincipal(req);
    guard(principal, ['admin', 'staff']);
    const { customerId, ...body } = createCareInteractionSchema.parse(req.body);
    const scope = branchScopeFor(principal);
    const customer = await repos.customers.findById(customerId, scope);
    if (!customer) throw AppError.of('VALIDATION_ERROR', 'Khách hàng không tồn tại');

    const interaction = await repos.careInteractions.create({
      ...body,
      customerId: customer.id,
      branchId: customer.branchId,
      actorId: principal.userId,
    });

    // Keep the follow-up loop alive: reflect the outcome onto the linked task.
    if (body.careTaskId) {
      if (body.disposition === 'refused') {
        await repos.careTasks.update(body.careTaskId, { status: 'lost' }, scope);
      } else if (
        (body.disposition === 'callback' || body.disposition === 'no_answer') &&
        body.nextFollowUpAt
      ) {
        await repos.careTasks.update(
          body.careTaskId,
          { nextFollowUpAt: body.nextFollowUpAt, status: 'contacting' },
          scope,
        );
      }
    }

    return created(reply, interaction, `/api/care-interactions/${interaction.id}`);
  });
}
