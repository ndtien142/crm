import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type {
  BranchScope,
  Inspection,
  InspectionListQuery,
  InspectionRepository,
  NewInspection,
  Paginated,
  UpdateInspection,
} from '@firecare/types';
import type { Db } from '../index';
import { toInspection } from '../mappers';
import { inspections } from '../schema';

function scoped(scope: BranchScope): SQL | undefined {
  if (scope.allBranches) return undefined;
  return eq(inspections.branchId, scope.branchId ?? '00000000-0000-0000-0000-000000000000');
}

/** Human inspection code (phiếu kiểm tra). */
function genCode(): string {
  return `KT-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export class DrizzleInspectionRepository implements InspectionRepository {
  constructor(private readonly db: Db) {}

  async list(query: InspectionListQuery): Promise<Paginated<Inspection>> {
    const conds: SQL[] = [];
    const s = scoped(query.scope);
    if (s) conds.push(s);
    if (query.siteId) conds.push(eq(inspections.siteId, query.siteId));
    if (query.assetId) conds.push(eq(inspections.assetId, query.assetId));
    if (query.customerId) conds.push(eq(inspections.customerId, query.customerId));
    if (query.type) conds.push(eq(inspections.type, query.type));
    if (query.status) conds.push(eq(inspections.status, query.status));
    if (query.inspectorId) conds.push(eq(inspections.inspectorId, query.inspectorId));
    if (query.priority) conds.push(eq(inspections.priority, query.priority));
    const where = conds.length ? and(...conds) : undefined;
    const order =
      query.sort === 'scheduled' ? asc(inspections.scheduledDate) : desc(inspections.createdAt);

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(inspections)
        .where(where)
        .orderBy(order)
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(inspections).where(where),
    ]);
    return { items: rows.map(toInspection), total: counted?.total ?? 0 };
  }

  async findById(id: string, scope: BranchScope): Promise<Inspection | null> {
    const conds = [eq(inspections.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .select()
      .from(inspections)
      .where(and(...conds))
      .limit(1);
    return row ? toInspection(row) : null;
  }

  async create(input: NewInspection): Promise<Inspection> {
    const [row] = await this.db
      .insert(inspections)
      .values({
        ...input,
        code: input.code ?? genCode(),
        result: input.result ?? [],
        evidence: input.evidence ?? [],
      })
      .returning();
    return toInspection(row!);
  }

  async update(id: string, patch: UpdateInspection, scope: BranchScope): Promise<Inspection | null> {
    const conds = [eq(inspections.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .update(inspections)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(...conds))
      .returning();
    return row ? toInspection(row) : null;
  }

  async delete(id: string, scope: BranchScope): Promise<boolean> {
    const conds = [eq(inspections.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const deleted = await this.db
      .delete(inspections)
      .where(and(...conds))
      .returning({ id: inspections.id });
    return deleted.length > 0;
  }

  async hasOpenForAsset(assetId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: inspections.id })
      .from(inspections)
      .where(
        and(eq(inspections.assetId, assetId), inArray(inspections.status, ['scheduled', 'in_progress'])),
      )
      .limit(1);
    return !!row;
  }
}
