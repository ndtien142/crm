import { and, asc, eq, type SQL } from 'drizzle-orm';
import type {
  NewServiceCatalogItem,
  ServiceCatalogItem,
  ServiceCatalogRepository,
  ServiceCategory,
  UpdateServiceCatalogItem,
} from '@firecare/types';
import type { Db } from '../index';
import { toServiceCatalogItem } from '../mappers';
import { serviceCatalog } from '../schema';

export class DrizzleServiceCatalogRepository implements ServiceCatalogRepository {
  constructor(private readonly db: Db) {}

  async list(query: {
    category?: ServiceCategory;
    includeInactive?: boolean;
  }): Promise<ServiceCatalogItem[]> {
    const conds: SQL[] = [];
    if (!query.includeInactive) conds.push(eq(serviceCatalog.isActive, true));
    if (query.category) conds.push(eq(serviceCatalog.category, query.category));
    const rows = await this.db
      .select()
      .from(serviceCatalog)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(serviceCatalog.name));
    return rows.map(toServiceCatalogItem);
  }

  async findById(id: string): Promise<ServiceCatalogItem | null> {
    const [row] = await this.db.select().from(serviceCatalog).where(eq(serviceCatalog.id, id)).limit(1);
    return row ? toServiceCatalogItem(row) : null;
  }

  async create(input: NewServiceCatalogItem): Promise<ServiceCatalogItem> {
    const [row] = await this.db
      .insert(serviceCatalog)
      .values({
        code: input.code ?? null,
        name: input.name,
        category: input.category,
        defaultCycleMonths: input.defaultCycleMonths ?? null,
        unit: input.unit ?? null,
        unitPrice: input.unitPrice,
        isActive: input.isActive ?? true,
      })
      .returning();
    return toServiceCatalogItem(row!);
  }

  async update(id: string, patch: UpdateServiceCatalogItem): Promise<ServiceCatalogItem | null> {
    const [row] = await this.db
      .update(serviceCatalog)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(eq(serviceCatalog.id, id))
      .returning();
    return row ? toServiceCatalogItem(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(serviceCatalog)
      .where(eq(serviceCatalog.id, id))
      .returning({ id: serviceCatalog.id });
    return deleted.length > 0;
  }
}
