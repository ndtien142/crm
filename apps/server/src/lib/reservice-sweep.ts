/**
 * Re-service sweep engine (P6) — the anti-churn heart. Completed service orders
 * carry a `nextDueDate` (the earliest line's due date). When that date enters the
 * lead window, this turns "an order is coming due" into "a card on the care board"
 * so nobody has to filter Excel by hand. Overdue orders get `urgent` priority.
 *
 * Idempotent: `hasTaskForOrder(order, 're_service_due', openOnly)` guards every
 * pass, so re-running never duplicates a still-open reminder. Mirrors the
 * inspection sweep's boot-then-24h cadence with an unref'd timer.
 */

import type { RepositoryBundle } from '@firecare/types';

export async function runReserviceSweep(
  repos: RepositoryBundle,
  leadDays: number,
): Promise<{ created: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const before = new Date(Date.now() + leadDays * 86_400_000).toISOString().slice(0, 10);
  const scope = { allBranches: true as const };
  const pageSize = 200;
  let created = 0;
  let page = 1;

  for (;;) {
    const { items, total } = await repos.serviceOrders.list({
      page,
      pageSize,
      scope,
      status: 'done',
      dueBefore: before,
      sort: 'due',
    });
    for (const order of items) {
      if (!order.nextDueDate) continue;
      if (await repos.careTasks.hasTaskForOrder(order.id, 're_service_due', true)) continue;
      const overdue = order.nextDueDate <= today;
      await repos.careTasks.create({
        branchId: order.branchId,
        customerId: order.customerId,
        title: `Đến hạn tái dịch vụ — ${order.code}`,
        type: 're_service_due',
        priority: overdue ? 'urgent' : 'high',
        dueDate: order.nextDueDate,
        relatedOrderId: order.id,
        notes: overdue ? 'Đã quá hạn — liên hệ khách ngay.' : 'Sắp đến hạn — chủ động liên hệ khách.',
      });
      created += 1;
    }
    if (items.length === 0 || page * pageSize >= total) break;
    page += 1;
  }
  return { created };
}

/** Run at boot then every `intervalMs` (default 24h). Returns a stopper. */
export function startReserviceSweep(
  repos: RepositoryBundle,
  opts: { leadDays: number; intervalMs?: number },
): () => void {
  const tick = () =>
    void runReserviceSweep(repos, opts.leadDays).catch((e) =>
      console.error('[reservice-sweep] failed:', e),
    );
  tick();
  const timer = setInterval(tick, opts.intervalMs ?? 24 * 60 * 60 * 1000);
  (timer as { unref?: () => void }).unref?.();
  return () => clearInterval(timer);
}
