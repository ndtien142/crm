import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import type {
  BranchScope,
  Fault,
  FaultListQuery,
  FaultRepository,
  NewFault,
  Paginated,
  UpdateFault,
} from '@firecare/types';
import type { Db } from '../index';
import { toFault } from '../mappers';
import { faults } from '../schema';

function scoped(scope: BranchScope): SQL | undefined {
  if (scope.allBranches) return undefined;
  return eq(faults.branchId, scope.branchId ?? '00000000-0000-0000-0000-000000000000');
}

export class DrizzleFaultRepository implements FaultRepository {
  constructor(private readonly db: Db) {}

  async list(query: FaultListQuery): Promise<Paginated<Fault>> {
    const conds: SQL[] = [];
    const s = scoped(query.scope);
    if (s) conds.push(s);
    if (query.assetId) conds.push(eq(faults.assetId, query.assetId));
    if (query.siteId) conds.push(eq(faults.siteId, query.siteId));
    if (query.customerId) conds.push(eq(faults.customerId, query.customerId));
    if (query.status) conds.push(eq(faults.status, query.status));
    if (query.severity) conds.push(eq(faults.severity, query.severity));
    const where = conds.length ? and(...conds) : undefined;

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(faults)
        .where(where)
        .orderBy(desc(faults.createdAt))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(faults).where(where),
    ]);
    return { items: rows.map(toFault), total: counted?.total ?? 0 };
  }

  async findById(id: string, scope: BranchScope): Promise<Fault | null> {
    const conds = [eq(faults.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .select()
      .from(faults)
      .where(and(...conds))
      .limit(1);
    return row ? toFault(row) : null;
  }

  async create(input: NewFault): Promise<Fault> {
    const [row] = await this.db.insert(faults).values(input).returning();
    return toFault(row!);
  }

  async update(id: string, patch: UpdateFault, scope: BranchScope): Promise<Fault | null> {
    const conds = [eq(faults.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .update(faults)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(...conds))
      .returning();
    return row ? toFault(row) : null;
  }

  async resolve(
    id: string,
    input: { resolvedAt: string; resolutionNote?: string | null },
    scope: BranchScope,
  ): Promise<Fault | null> {
    const conds = [eq(faults.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .update(faults)
      .set({
        status: 'resolved',
        resolvedAt: input.resolvedAt,
        resolutionNote: input.resolutionNote ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(...conds))
      .returning();
    return row ? toFault(row) : null;
  }

  async delete(id: string, scope: BranchScope): Promise<boolean> {
    const conds = [eq(faults.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const deleted = await this.db
      .delete(faults)
      .where(and(...conds))
      .returning({ id: faults.id });
    return deleted.length > 0;
  }
}
