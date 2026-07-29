import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import type {
  BranchScope,
  NewServiceOrder,
  NewServiceOrderLine,
  Paginated,
  PaymentStatus,
  ServiceOrder,
  ServiceOrderListQuery,
  ServiceOrderRepository,
  UpdateServiceOrder,
} from '@firecare/types';
import type { Db } from '../index';
import { toServiceOrder, toServiceOrderLine } from '../mappers';
import { serviceOrderLines, serviceOrders } from '../schema';

function scoped(scope: BranchScope): SQL | undefined {
  if (scope.allBranches) return undefined;
  return eq(serviceOrders.branchId, scope.branchId ?? '00000000-0000-0000-0000-000000000000');
}

function genCode(): string {
  return `PDV-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export class DrizzleServiceOrderRepository implements ServiceOrderRepository {
  constructor(private readonly db: Db) {}

  async list(query: ServiceOrderListQuery): Promise<Paginated<ServiceOrder>> {
    const conds: SQL[] = [];
    const s = scoped(query.scope);
    if (s) conds.push(s);
    if (query.customerId) conds.push(eq(serviceOrders.customerId, query.customerId));
    if (query.status) conds.push(eq(serviceOrders.status, query.status));
    if (query.paymentStatus) conds.push(eq(serviceOrders.paymentStatus, query.paymentStatus));
    const where = conds.length ? and(...conds) : undefined;
    const order = query.sort === 'due' ? asc(serviceOrders.nextDueDate) : desc(serviceOrders.createdAt);

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(serviceOrders)
        .where(where)
        .orderBy(order)
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(serviceOrders).where(where),
    ]);
    return { items: rows.map((r) => toServiceOrder(r)), total: counted?.total ?? 0 };
  }

  async findById(id: string, scope: BranchScope): Promise<ServiceOrder | null> {
    const conds = [eq(serviceOrders.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [orderRow] = await this.db
      .select()
      .from(serviceOrders)
      .where(and(...conds))
      .limit(1);
    if (!orderRow) return null;
    const lines = await this.db
      .select()
      .from(serviceOrderLines)
      .where(eq(serviceOrderLines.orderId, id));
    return toServiceOrder(orderRow, lines.map(toServiceOrderLine));
  }

  async create(order: NewServiceOrder, lines: NewServiceOrderLine[]): Promise<ServiceOrder> {
    const computed = lines.map((l) => ({ ...l, lineAmount: (l.quantity || 0) * (l.unitPrice || 0) }));
    const total = computed.reduce((sum, l) => sum + l.lineAmount, 0);

    const result = await this.db.transaction(async (tx) => {
      const [o] = await tx
        .insert(serviceOrders)
        .values({ ...order, code: order.code ?? genCode(), totalAmount: total })
        .returning();
      const lineRows = computed.length
        ? await tx
            .insert(serviceOrderLines)
            .values(
              computed.map((l) => ({
                orderId: o!.id,
                serviceId: l.serviceId ?? null,
                description: l.description,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                lineAmount: l.lineAmount,
                cycleMonths: l.cycleMonths ?? null,
              })),
            )
            .returning()
        : [];
      return { order: o!, lineRows };
    });
    return toServiceOrder(result.order, result.lineRows.map(toServiceOrderLine));
  }

  async update(id: string, patch: UpdateServiceOrder, scope: BranchScope): Promise<ServiceOrder | null> {
    const conds = [eq(serviceOrders.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .update(serviceOrders)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(...conds))
      .returning();
    return row ? toServiceOrder(row) : null;
  }

  async complete(
    id: string,
    input: { performedAt: string; performedById?: string | null },
    scope: BranchScope,
  ): Promise<ServiceOrder | null> {
    const existing = await this.findById(id, scope);
    if (!existing) return null;
    const lines = existing.lines ?? [];
    const dueDates = lines.map((l) => (l.cycleMonths ? addMonths(input.performedAt, l.cycleMonths) : null));
    const nextDue = dueDates.filter((d): d is string => !!d).sort()[0] ?? null;

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < lines.length; i++) {
        await tx
          .update(serviceOrderLines)
          .set({ lineDueDate: dueDates[i] ?? null })
          .where(eq(serviceOrderLines.id, lines[i]!.id));
      }
      await tx
        .update(serviceOrders)
        .set({
          status: 'done',
          performedAt: input.performedAt,
          performedById: input.performedById ?? null,
          nextDueDate: nextDue,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(serviceOrders.id, id));
    });
    return this.findById(id, scope);
  }

  async setPayment(
    id: string,
    input: { paymentStatus: PaymentStatus; paidAmount: number },
    scope: BranchScope,
  ): Promise<ServiceOrder | null> {
    const conds = [eq(serviceOrders.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const [row] = await this.db
      .update(serviceOrders)
      .set({
        paymentStatus: input.paymentStatus,
        paidAmount: input.paidAmount,
        updatedAt: new Date().toISOString(),
      })
      .where(and(...conds))
      .returning();
    return row ? toServiceOrder(row) : null;
  }

  async delete(id: string, scope: BranchScope): Promise<boolean> {
    const conds = [eq(serviceOrders.id, id)];
    const s = scoped(scope);
    if (s) conds.push(s);
    const deleted = await this.db
      .delete(serviceOrders)
      .where(and(...conds))
      .returning({ id: serviceOrders.id });
    return deleted.length > 0;
  }
}
