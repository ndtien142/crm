import { and, asc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type {
  Branch,
  BranchRepository,
  NewBranch,
  PageQuery,
  Paginated,
  UpdateBranch,
} from '@firecare/types';
import type { Db } from '../index';
import { toBranch } from '../mappers';
import { branches } from '../schema';

export class DrizzleBranchRepository implements BranchRepository {
  constructor(private readonly db: Db) {}

  async list(
    query: PageQuery & { q?: string; includeInactive?: boolean },
  ): Promise<Paginated<Branch>> {
    const conditions: SQL[] = [];
    if (!query.includeInactive) conditions.push(eq(branches.isActive, true));
    if (query.q) {
      const like = `%${query.q}%`;
      conditions.push(or(ilike(branches.name, like), ilike(branches.code, like))!);
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(branches)
        .where(where)
        .orderBy(asc(branches.name))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(branches).where(where),
    ]);

    return { items: rows.map(toBranch), total: counted?.total ?? 0 };
  }

  async findById(id: string): Promise<Branch | null> {
    const [row] = await this.db.select().from(branches).where(eq(branches.id, id)).limit(1);
    return row ? toBranch(row) : null;
  }

  async findByCode(code: string): Promise<Branch | null> {
    const [row] = await this.db.select().from(branches).where(eq(branches.code, code)).limit(1);
    return row ? toBranch(row) : null;
  }

  async create(input: NewBranch): Promise<Branch> {
    const [row] = await this.db.insert(branches).values(input).returning();
    return toBranch(row!);
  }

  async update(id: string, patch: UpdateBranch): Promise<Branch | null> {
    const [row] = await this.db
      .update(branches)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(eq(branches.id, id))
      .returning();
    return row ? toBranch(row) : null;
  }

  async setActive(id: string, isActive: boolean): Promise<Branch | null> {
    const [row] = await this.db
      .update(branches)
      .set({ isActive, updatedAt: new Date().toISOString() })
      .where(eq(branches.id, id))
      .returning();
    return row ? toBranch(row) : null;
  }
}
