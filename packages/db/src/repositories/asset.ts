import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import type {
  Asset,
  AssetListQuery,
  AssetRepository,
  BranchScope,
  NewAsset,
  Paginated,
  UpdateAsset,
} from '@firecare/types';
import type { Db } from '../index';
import { toAsset } from '../mappers';
import { assets } from '../schema';

/** Device-tag QR payload; unique per branch. */
function genQr(): string {
  return `FC-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function scoped(scope: BranchScope): SQL | undefined {
  if (scope.allBranches) return undefined;
  return eq(assets.branchId, scope.branchId ?? '00000000-0000-0000-0000-000000000000');
}

export class DrizzleAssetRepository implements AssetRepository {
  constructor(private readonly db: Db) {}

  async list(query: AssetListQuery): Promise<Paginated<Asset>> {
    const conditions: SQL[] = [];
    const s = scoped(query.scope);
    if (s) conditions.push(s);
    if (query.siteId) conditions.push(eq(assets.siteId, query.siteId));
    if (query.customerId) conditions.push(eq(assets.customerId, query.customerId));
    if (query.category) conditions.push(eq(assets.category, query.category));
    if (query.status) conditions.push(eq(assets.status, query.status));
    if (query.dueBefore) conditions.push(sql`${assets.nextDueDate} <= ${query.dueBefore}`);
    if (query.q) {
      conditions.push(sql`search_text LIKE '%' || unaccent(lower(${query.q})) || '%'`);
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const order = query.sort === 'due' ? asc(assets.nextDueDate) : desc(assets.createdAt);

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(assets)
        .where(where)
        .orderBy(order)
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(assets).where(where),
    ]);
    return { items: rows.map(toAsset), total: counted?.total ?? 0 };
  }

  async findById(id: string, scope: BranchScope): Promise<Asset | null> {
    const conds = [eq(assets.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .select()
      .from(assets)
      .where(and(...conds))
      .limit(1);
    return row ? toAsset(row) : null;
  }

  async findByQr(qrCode: string, scope: BranchScope): Promise<Asset | null> {
    const conds = [eq(assets.qrCode, qrCode)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .select()
      .from(assets)
      .where(and(...conds))
      .limit(1);
    return row ? toAsset(row) : null;
  }

  async create(input: NewAsset): Promise<Asset> {
    const [row] = await this.db
      .insert(assets)
      .values({ ...input, qrCode: input.qrCode ?? genQr() })
      .returning();
    return toAsset(row!);
  }

  async update(id: string, patch: UpdateAsset, scope: BranchScope): Promise<Asset | null> {
    const conds = [eq(assets.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .update(assets)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(...conds))
      .returning();
    return row ? toAsset(row) : null;
  }

  async delete(id: string, scope: BranchScope): Promise<boolean> {
    const conds = [eq(assets.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const deleted = await this.db
      .delete(assets)
      .where(and(...conds))
      .returning({ id: assets.id });
    return deleted.length > 0;
  }

  async bulkCreate(
    context: { branchId: string; siteId: string; customerId: string },
    rows: NewAsset[],
  ): Promise<{ inserted: number; skipped: number; skippedRefs: string[] }> {
    const existing = await this.db
      .select({ serialNo: assets.serialNo })
      .from(assets)
      .where(eq(assets.siteId, context.siteId));
    const seen = new Set(existing.map((r) => r.serialNo).filter((v): v is string => !!v));

    const toInsert: (NewAsset & { qrCode: string })[] = [];
    const skippedRefs: string[] = [];
    for (const row of rows) {
      const serial = row.serialNo?.trim();
      if (serial && seen.has(serial)) {
        skippedRefs.push(serial);
        continue;
      }
      if (serial) seen.add(serial);
      toInsert.push({
        ...row,
        branchId: context.branchId,
        siteId: context.siteId,
        customerId: context.customerId,
        qrCode: row.qrCode ?? genQr(),
      });
    }

    const CHUNK = 500;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      if (chunk.length) await this.db.insert(assets).values(chunk);
    }
    return { inserted: toInsert.length, skipped: skippedRefs.length, skippedRefs };
  }
}
