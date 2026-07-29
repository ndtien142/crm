import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import type {
  BranchScope,
  CareInteraction,
  CareInteractionListQuery,
  CareInteractionRepository,
  NewCareInteraction,
  Paginated,
} from '@firecare/types';
import type { Db } from '../index';
import { toCareInteraction } from '../mappers';
import { careInteractions } from '../schema';

function scoped(scope: BranchScope): SQL | undefined {
  if (scope.allBranches) return undefined;
  return eq(careInteractions.branchId, scope.branchId ?? '00000000-0000-0000-0000-000000000000');
}

export class DrizzleCareInteractionRepository implements CareInteractionRepository {
  constructor(private readonly db: Db) {}

  async list(query: CareInteractionListQuery): Promise<Paginated<CareInteraction>> {
    const conds: SQL[] = [];
    const s = scoped(query.scope);
    if (s) conds.push(s);
    if (query.customerId) conds.push(eq(careInteractions.customerId, query.customerId));
    if (query.careTaskId) conds.push(eq(careInteractions.careTaskId, query.careTaskId));
    const where = conds.length ? and(...conds) : undefined;

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(careInteractions)
        .where(where)
        .orderBy(desc(careInteractions.occurredAt))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(careInteractions).where(where),
    ]);
    return { items: rows.map(toCareInteraction), total: counted?.total ?? 0 };
  }

  async create(input: NewCareInteraction): Promise<CareInteraction> {
    const [row] = await this.db.insert(careInteractions).values(input).returning();
    return toCareInteraction(row!);
  }
}
