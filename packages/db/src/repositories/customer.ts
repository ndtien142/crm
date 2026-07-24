import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import type {
  BranchScope,
  Customer,
  CustomerListQuery,
  CustomerRepository,
  NewCustomer,
  Paginated,
  UpdateCustomer,
} from '@firecare/types';
import type { Db } from '../index';
import { toCustomer } from '../mappers';
import { customers } from '../schema';

/** Constrain a query to the caller's branch unless they may see all branches. */
function scopeCondition(scope: BranchScope): SQL | undefined {
  if (scope.allBranches) return undefined;
  // A scoped caller with no branch can see nothing (defensive).
  return eq(customers.branchId, scope.branchId ?? '00000000-0000-0000-0000-000000000000');
}

export class DrizzleCustomerRepository implements CustomerRepository {
  constructor(private readonly db: Db) {}

  async list(query: CustomerListQuery): Promise<Paginated<Customer>> {
    const conditions: SQL[] = [];
    const scoped = scopeCondition(query.scope);
    if (scoped) conditions.push(scoped);
    if (query.type) conditions.push(eq(customers.type, query.type));
    if (query.status) conditions.push(eq(customers.status, query.status));
    if (query.assignedStaffId) conditions.push(eq(customers.assignedStaffId, query.assignedStaffId));
    if (query.tag) conditions.push(sql`${query.tag} = ANY(${customers.tags})`);
    // Accent-insensitive search against the generated `search_text` column
    // (created by sql/postgis.sql — run `pnpm db:extras`).
    if (query.q) {
      conditions.push(sql`search_text LIKE '%' || unaccent(lower(${query.q})) || '%'`);
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const order = query.sort === 'name' ? asc(customers.name) : desc(customers.createdAt);

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(customers)
        .where(where)
        .orderBy(order)
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(customers).where(where),
    ]);

    return { items: rows.map(toCustomer), total: counted?.total ?? 0 };
  }

  async findById(id: string, scope: BranchScope): Promise<Customer | null> {
    const conditions = [eq(customers.id, id)];
    const scoped = scopeCondition(scope);
    if (scoped) conditions.push(scoped);
    const [row] = await this.db
      .select()
      .from(customers)
      .where(and(...conditions))
      .limit(1);
    return row ? toCustomer(row) : null;
  }

  async create(input: NewCustomer): Promise<Customer> {
    const [row] = await this.db
      .insert(customers)
      .values({ ...input, tags: input.tags ?? [] })
      .returning();
    return toCustomer(row!);
  }

  async update(id: string, patch: UpdateCustomer, scope: BranchScope): Promise<Customer | null> {
    const conditions = [eq(customers.id, id)];
    const scoped = scopeCondition(scope);
    if (scoped) conditions.push(scoped);
    const [row] = await this.db
      .update(customers)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(...conditions))
      .returning();
    return row ? toCustomer(row) : null;
  }

  async delete(id: string, scope: BranchScope): Promise<boolean> {
    const conditions = [eq(customers.id, id)];
    const scoped = scopeCondition(scope);
    if (scoped) conditions.push(scoped);
    const deleted = await this.db
      .delete(customers)
      .where(and(...conditions))
      .returning({ id: customers.id });
    return deleted.length > 0;
  }

  async bulkCreate(
    branchId: string,
    rows: NewCustomer[],
  ): Promise<{ inserted: number; skipped: number; skippedPhones: string[] }> {
    // Existing phones in this branch — used to skip duplicates on re-import.
    const existing = await this.db
      .select({ phone: customers.phone })
      .from(customers)
      .where(eq(customers.branchId, branchId));
    const seen = new Set(existing.map((r) => r.phone).filter((p): p is string => !!p));

    const toInsert: NewCustomer[] = [];
    const skippedPhones: string[] = [];
    for (const row of rows) {
      const phone = row.phone?.trim();
      if (phone && seen.has(phone)) {
        skippedPhones.push(phone);
        continue;
      }
      if (phone) seen.add(phone);
      toInsert.push({ ...row, branchId, tags: row.tags ?? [] });
    }

    // Chunk inserts to stay well under the Postgres 65535-param cap.
    const CHUNK = 500;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      if (chunk.length) await this.db.insert(customers).values(chunk);
    }

    return { inserted: toInsert.length, skipped: skippedPhones.length, skippedPhones };
  }
}
