import { and, asc, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import type {
  BranchScope,
  CareTask,
  CareTaskListQuery,
  CareTaskRepository,
  CareTaskType,
  NewCareTask,
  Paginated,
  UpdateCareTask,
} from '@firecare/types';
import type { Db } from '../index';
import { toCareTask } from '../mappers';
import { careTasks } from '../schema';

function scoped(scope: BranchScope): SQL | undefined {
  if (scope.allBranches) return undefined;
  return eq(careTasks.branchId, scope.branchId ?? '00000000-0000-0000-0000-000000000000');
}

export class DrizzleCareTaskRepository implements CareTaskRepository {
  constructor(private readonly db: Db) {}

  async list(query: CareTaskListQuery): Promise<Paginated<CareTask>> {
    const conds: SQL[] = [];
    const s = scoped(query.scope);
    if (s) conds.push(s);
    if (query.status) conds.push(eq(careTasks.status, query.status));
    if (query.type) conds.push(eq(careTasks.type, query.type));
    if (query.priority) conds.push(eq(careTasks.priority, query.priority));
    if (query.customerId) conds.push(eq(careTasks.customerId, query.customerId));
    if (query.assigneeId) conds.push(eq(careTasks.assigneeId, query.assigneeId));
    if (query.unassignedOnly) conds.push(isNull(careTasks.assigneeId));
    const where = conds.length ? and(...conds) : undefined;

    const order =
      query.sort === 'recent'
        ? [desc(careTasks.createdAt)]
        : query.sort === 'due'
          ? [asc(careTasks.dueDate)]
          : [asc(careTasks.position), desc(careTasks.createdAt)];

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(careTasks)
        .where(where)
        .orderBy(...order)
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(careTasks).where(where),
    ]);
    return { items: rows.map(toCareTask), total: counted?.total ?? 0 };
  }

  async findById(id: string, scope: BranchScope): Promise<CareTask | null> {
    const conds = [eq(careTasks.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .select()
      .from(careTasks)
      .where(and(...conds))
      .limit(1);
    return row ? toCareTask(row) : null;
  }

  async create(input: NewCareTask): Promise<CareTask> {
    const [row] = await this.db.insert(careTasks).values(input).returning();
    return toCareTask(row!);
  }

  async update(id: string, patch: UpdateCareTask, scope: BranchScope): Promise<CareTask | null> {
    const conds = [eq(careTasks.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .update(careTasks)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(...conds))
      .returning();
    return row ? toCareTask(row) : null;
  }

  /** Atomic claim: the `isNull(assigneeId)` guard means two claimers can't both win. */
  async claim(id: string, userId: string, scope: BranchScope): Promise<CareTask | null> {
    const conds = [eq(careTasks.id, id), isNull(careTasks.assigneeId)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .update(careTasks)
      .set({ assigneeId: userId, updatedAt: new Date().toISOString() })
      .where(and(...conds))
      .returning();
    return row ? toCareTask(row) : null;
  }

  async release(id: string, scope: BranchScope): Promise<CareTask | null> {
    const conds = [eq(careTasks.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .update(careTasks)
      .set({ assigneeId: null, updatedAt: new Date().toISOString() })
      .where(and(...conds))
      .returning();
    return row ? toCareTask(row) : null;
  }

  async delete(id: string, scope: BranchScope): Promise<boolean> {
    const conds = [eq(careTasks.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const deleted = await this.db
      .delete(careTasks)
      .where(and(...conds))
      .returning({ id: careTasks.id });
    return deleted.length > 0;
  }

  async hasTaskForOrder(orderId: string, type: CareTaskType, openOnly: boolean): Promise<boolean> {
    const conds: SQL[] = [eq(careTasks.relatedOrderId, orderId), eq(careTasks.type, type)];
    if (openOnly) {
      conds.push(sql`${careTasks.status} in ('todo','contacting','scheduled','in_progress')`);
    }
    const [row] = await this.db
      .select({ id: careTasks.id })
      .from(careTasks)
      .where(and(...conds))
      .limit(1);
    return Boolean(row);
  }
}
