import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import type {
  BranchScope,
  NewSite,
  Paginated,
  Site,
  SiteListQuery,
  SiteRepository,
  UpdateSite,
} from '@firecare/types';
import type { Db } from '../index';
import { toSite } from '../mappers';
import { sites } from '../schema';

function scoped(scope: BranchScope): SQL | undefined {
  if (scope.allBranches) return undefined;
  return eq(sites.branchId, scope.branchId ?? '00000000-0000-0000-0000-000000000000');
}

export class DrizzleSiteRepository implements SiteRepository {
  constructor(private readonly db: Db) {}

  async list(query: SiteListQuery): Promise<Paginated<Site>> {
    const conditions: SQL[] = [];
    const s = scoped(query.scope);
    if (s) conditions.push(s);
    if (query.customerId) conditions.push(eq(sites.customerId, query.customerId));
    if (query.type) conditions.push(eq(sites.type, query.type));
    if (query.q) {
      conditions.push(sql`search_text LIKE '%' || unaccent(lower(${query.q})) || '%'`);
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(sites)
        .where(where)
        .orderBy(desc(sites.createdAt))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(sites).where(where),
    ]);
    return { items: rows.map(toSite), total: counted?.total ?? 0 };
  }

  async findById(id: string, scope: BranchScope): Promise<Site | null> {
    const conds = [eq(sites.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .select()
      .from(sites)
      .where(and(...conds))
      .limit(1);
    return row ? toSite(row) : null;
  }

  async create(input: NewSite): Promise<Site> {
    const [row] = await this.db.insert(sites).values(input).returning();
    return toSite(row!);
  }

  async update(id: string, patch: UpdateSite, scope: BranchScope): Promise<Site | null> {
    const conds = [eq(sites.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .update(sites)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(...conds))
      .returning();
    return row ? toSite(row) : null;
  }

  async delete(id: string, scope: BranchScope): Promise<boolean> {
    const conds = [eq(sites.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const deleted = await this.db
      .delete(sites)
      .where(and(...conds))
      .returning({ id: sites.id });
    return deleted.length > 0;
  }
}
