import { and, asc, eq, type SQL } from 'drizzle-orm';
import type {
  ChecklistTemplate,
  ChecklistTemplateRepository,
  NewChecklistTemplate,
  UpdateChecklistTemplate,
} from '@firecare/types';
import type { Db } from '../index';
import { toChecklistTemplate } from '../mappers';
import { checklistTemplates } from '../schema';

export class DrizzleChecklistTemplateRepository implements ChecklistTemplateRepository {
  constructor(private readonly db: Db) {}

  async list(query: {
    inspectionType?: ChecklistTemplate['inspectionType'];
    assetCategory?: NonNullable<ChecklistTemplate['assetCategory']>;
    includeInactive?: boolean;
  }): Promise<ChecklistTemplate[]> {
    const conds: SQL[] = [];
    if (!query.includeInactive) conds.push(eq(checklistTemplates.isActive, true));
    if (query.inspectionType)
      conds.push(eq(checklistTemplates.inspectionType, query.inspectionType));
    if (query.assetCategory) conds.push(eq(checklistTemplates.assetCategory, query.assetCategory));
    const rows = await this.db
      .select()
      .from(checklistTemplates)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(checklistTemplates.name));
    return rows.map(toChecklistTemplate);
  }

  async findById(id: string): Promise<ChecklistTemplate | null> {
    const [row] = await this.db
      .select()
      .from(checklistTemplates)
      .where(eq(checklistTemplates.id, id))
      .limit(1);
    return row ? toChecklistTemplate(row) : null;
  }

  async create(input: NewChecklistTemplate): Promise<ChecklistTemplate> {
    const [row] = await this.db
      .insert(checklistTemplates)
      .values({
        name: input.name,
        inspectionType: input.inspectionType,
        assetCategory: input.assetCategory ?? null,
        items: input.items,
        isActive: input.isActive ?? true,
      })
      .returning();
    return toChecklistTemplate(row!);
  }

  async update(id: string, patch: UpdateChecklistTemplate): Promise<ChecklistTemplate | null> {
    const [row] = await this.db
      .update(checklistTemplates)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(eq(checklistTemplates.id, id))
      .returning();
    return row ? toChecklistTemplate(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(checklistTemplates)
      .where(eq(checklistTemplates.id, id))
      .returning({ id: checklistTemplates.id });
    return deleted.length > 0;
  }
}
