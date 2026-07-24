import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type {
  NewUser,
  PageQuery,
  Paginated,
  Role,
  UpdateUser,
  User,
  UserRepository,
} from '@firecare/types';
import type { Db } from '../index';
import { toUser } from '../mappers';
import { users } from '../schema';

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Db) {}

  async list(
    query: PageQuery & { role?: Role; branchId?: string; q?: string },
  ): Promise<Paginated<User>> {
    const conditions: SQL[] = [];
    if (query.role) conditions.push(eq(users.role, query.role));
    if (query.branchId) conditions.push(eq(users.branchId, query.branchId));
    if (query.q) {
      const like = `%${query.q}%`;
      conditions.push(or(ilike(users.name, like), ilike(users.email, like))!);
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(users).where(where),
    ]);

    return { items: rows.map(toUser), total: counted?.total ?? 0 };
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
      .limit(1);
    return row ? toUser(row) : null;
  }

  async findAuthByEmail(email: string): Promise<{ user: User; passwordHash: string } | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
      .limit(1);
    return row ? { user: toUser(row), passwordHash: row.passwordHash } : null;
  }

  async create(input: NewUser): Promise<User> {
    const [row] = await this.db
      .insert(users)
      .values({
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name,
        role: input.role,
        branchId: input.branchId,
        phone: input.phone ?? null,
        isFieldStaff: input.isFieldStaff ?? false,
      })
      .returning();
    return toUser(row!);
  }

  async update(id: string, patch: UpdateUser): Promise<User | null> {
    const [row] = await this.db
      .update(users)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id))
      .returning();
    return row ? toUser(row) : null;
  }

  async setActive(id: string, isActive: boolean): Promise<User | null> {
    const [row] = await this.db
      .update(users)
      .set({ isActive, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id))
      .returning();
    return row ? toUser(row) : null;
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id));
  }
}
