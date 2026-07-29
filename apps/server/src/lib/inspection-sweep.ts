/**
 * Auto-schedule engine (P3). Finds active assets whose next inspection is due
 * within the lead window and have no open inspection yet, then creates a
 * `scheduled` inspection for each — overdue assets get `urgent` priority. This
 * is what turns "assets have due dates" into "the team is told what to inspect".
 * Idempotent: `hasOpenForAsset` prevents duplicates on every pass.
 */

import type { RepositoryBundle } from '@firecare/types';

export async function runInspectionSweep(
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
    const { items, total } = await repos.assets.list({
      page,
      pageSize,
      scope,
      dueBefore: before,
      status: 'active',
      sort: 'due',
    });
    for (const asset of items) {
      if (!asset.nextDueDate) continue;
      if (await repos.inspections.hasOpenForAsset(asset.id)) continue;
      await repos.inspections.create({
        branchId: asset.branchId,
        siteId: asset.siteId,
        assetId: asset.id,
        customerId: asset.customerId,
        type: 'routine',
        scheduledDate: asset.nextDueDate,
        status: 'scheduled',
        priority: asset.nextDueDate <= today ? 'urgent' : 'high',
      });
      created += 1;
    }
    if (items.length === 0 || page * pageSize >= total) break;
    page += 1;
  }
  return { created };
}

/** Run the sweep at boot then every `intervalMs` (default 24h). Returns a stopper. */
export function startInspectionSweep(
  repos: RepositoryBundle,
  opts: { leadDays: number; intervalMs?: number },
): () => void {
  const tick = () =>
    void runInspectionSweep(repos, opts.leadDays).catch((e) =>
      console.error('[inspection-sweep] failed:', e),
    );
  tick();
  const timer = setInterval(tick, opts.intervalMs ?? 24 * 60 * 60 * 1000);
  (timer as { unref?: () => void }).unref?.();
  return () => clearInterval(timer);
}
