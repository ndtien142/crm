/**
 * In-memory `RepositoryBundle` — the mock side of the repository seam. Used by
 * unit tests and by the server when `DATABASE_URL` is unset. Filtering here is
 * accent-sensitive (good enough for tests); Postgres does the real unaccent.
 */

import { randomUUID } from 'node:crypto';
import type {
  AuthRepository,
  Branch,
  BranchRepository,
  BranchScope,
  Customer,
  CustomerListQuery,
  CustomerRepository,
  NewBranch,
  NewCustomer,
  NewUser,
  PageQuery,
  Paginated,
  RefreshSession,
  RepositoryBundle,
  Role,
  UpdateBranch,
  UpdateCustomer,
  UpdateUser,
  User,
  UserRepository,
} from '@firecare/types';

const now = () => new Date().toISOString();

function paginate<T>(items: T[], q: PageQuery): Paginated<T> {
  const start = (q.page - 1) * q.pageSize;
  return { items: items.slice(start, start + q.pageSize), total: items.length };
}

class MockAuthRepository implements AuthRepository {
  private sessions: RefreshSession[] = [];

  async createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<RefreshSession> {
    const session: RefreshSession = {
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      createdAt: now(),
    };
    this.sessions.push(session);
    return session;
  }

  async findSessionByHash(tokenHash: string): Promise<RefreshSession | null> {
    return this.sessions.find((s) => s.tokenHash === tokenHash) ?? null;
  }

  async revokeSession(id: string): Promise<void> {
    const s = this.sessions.find((x) => x.id === id);
    if (s) s.revokedAt = now();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    for (const s of this.sessions) if (s.userId === userId && !s.revokedAt) s.revokedAt = now();
  }
}

type UserRecord = User & { passwordHash: string };

class MockUserRepository implements UserRepository {
  constructor(private readonly store: UserRecord[]) {}

  async list(query: PageQuery & { role?: Role; branchId?: string; q?: string }) {
    const q = query.q?.toLowerCase();
    const filtered = this.store.filter(
      (u) =>
        (!query.role || u.role === query.role) &&
        (!query.branchId || u.branchId === query.branchId) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    );
    const page = paginate(filtered, query);
    return { items: page.items.map(strip), total: page.total };
  }

  async findById(id: string): Promise<User | null> {
    const u = this.store.find((x) => x.id === id);
    return u ? strip(u) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const u = this.store.find((x) => x.email.toLowerCase() === email.toLowerCase());
    return u ? strip(u) : null;
  }

  async findAuthByEmail(email: string) {
    const u = this.store.find((x) => x.email.toLowerCase() === email.toLowerCase());
    return u ? { user: strip(u), passwordHash: u.passwordHash } : null;
  }

  async create(input: NewUser): Promise<User> {
    const rec: UserRecord = {
      id: randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name,
      role: input.role,
      branchId: input.branchId,
      phone: input.phone ?? null,
      isFieldStaff: input.isFieldStaff ?? false,
      avatarUrl: null,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    };
    this.store.push(rec);
    return strip(rec);
  }

  async update(id: string, patch: UpdateUser): Promise<User | null> {
    const u = this.store.find((x) => x.id === id);
    if (!u) return null;
    Object.assign(u, patch, { updatedAt: now() });
    return strip(u);
  }

  async setActive(id: string, isActive: boolean): Promise<User | null> {
    const u = this.store.find((x) => x.id === id);
    if (!u) return null;
    u.isActive = isActive;
    u.updatedAt = now();
    return strip(u);
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const u = this.store.find((x) => x.id === id);
    if (u) {
      u.passwordHash = passwordHash;
      u.updatedAt = now();
    }
  }
}

function strip(rec: UserRecord): User {
  const { passwordHash: _omit, ...user } = rec;
  return user;
}

class MockBranchRepository implements BranchRepository {
  constructor(private readonly store: Branch[]) {}

  async list(query: PageQuery & { q?: string; includeInactive?: boolean }) {
    const q = query.q?.toLowerCase();
    const filtered = this.store.filter(
      (b) =>
        (query.includeInactive || b.isActive) &&
        (!q || b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)),
    );
    return paginate(filtered, query);
  }

  async findById(id: string): Promise<Branch | null> {
    return this.store.find((b) => b.id === id) ?? null;
  }

  async findByCode(code: string): Promise<Branch | null> {
    return this.store.find((b) => b.code === code) ?? null;
  }

  async create(input: NewBranch): Promise<Branch> {
    const branch: Branch = {
      id: randomUUID(),
      code: input.code,
      name: input.name,
      address: input.address ?? null,
      ward: input.ward ?? null,
      district: input.district ?? null,
      city: input.city ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      googleLocationId: null,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    };
    this.store.push(branch);
    return branch;
  }

  async update(id: string, patch: UpdateBranch): Promise<Branch | null> {
    const b = this.store.find((x) => x.id === id);
    if (!b) return null;
    Object.assign(b, patch, { updatedAt: now() });
    return b;
  }

  async setActive(id: string, isActive: boolean): Promise<Branch | null> {
    const b = this.store.find((x) => x.id === id);
    if (!b) return null;
    b.isActive = isActive;
    b.updatedAt = now();
    return b;
  }
}

function inScope(c: Customer, scope: BranchScope): boolean {
  return scope.allBranches || c.branchId === scope.branchId;
}

class MockCustomerRepository implements CustomerRepository {
  constructor(private readonly store: Customer[]) {}

  async list(query: CustomerListQuery): Promise<Paginated<Customer>> {
    const q = query.q?.toLowerCase();
    let filtered = this.store.filter(
      (c) =>
        inScope(c, query.scope) &&
        (!query.type || c.type === query.type) &&
        (!query.status || c.status === query.status) &&
        (!query.assignedStaffId || c.assignedStaffId === query.assignedStaffId) &&
        (!query.tag || c.tags.includes(query.tag)) &&
        (!q ||
          c.name.toLowerCase().includes(q) ||
          (c.phone ?? '').includes(q) ||
          (c.address ?? '').toLowerCase().includes(q)),
    );
    filtered =
      query.sort === 'name'
        ? filtered.sort((a, b) => a.name.localeCompare(b.name))
        : filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(filtered, query);
  }

  async findById(id: string, scope: BranchScope): Promise<Customer | null> {
    const c = this.store.find((x) => x.id === id);
    return c && inScope(c, scope) ? c : null;
  }

  async create(input: NewCustomer): Promise<Customer> {
    const c: Customer = {
      id: randomUUID(),
      branchId: input.branchId,
      code: input.code ?? null,
      type: input.type,
      name: input.name,
      phone: input.phone ?? null,
      altPhone: input.altPhone ?? null,
      email: input.email ?? null,
      taxCode: input.taxCode ?? null,
      address: input.address ?? null,
      ward: input.ward ?? null,
      district: input.district ?? null,
      city: input.city ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      source: input.source ?? 'manual',
      tags: input.tags ?? [],
      assignedStaffId: input.assignedStaffId ?? null,
      status: input.status ?? 'active',
      notes: input.notes ?? null,
      createdById: input.createdById ?? null,
      createdAt: now(),
      updatedAt: now(),
    };
    this.store.push(c);
    return c;
  }

  async update(id: string, patch: UpdateCustomer, scope: BranchScope): Promise<Customer | null> {
    const c = this.store.find((x) => x.id === id);
    if (!c || !inScope(c, scope)) return null;
    Object.assign(c, patch, { updatedAt: now() });
    return c;
  }

  async delete(id: string, scope: BranchScope): Promise<boolean> {
    const idx = this.store.findIndex((x) => x.id === id && inScope(x, scope));
    if (idx < 0) return false;
    this.store.splice(idx, 1);
    return true;
  }

  async bulkCreate(branchId: string, rows: NewCustomer[]) {
    const seen = new Set(
      this.store
        .filter((c) => c.branchId === branchId)
        .map((c) => c.phone)
        .filter((p): p is string => !!p),
    );
    const skippedPhones: string[] = [];
    let inserted = 0;
    for (const row of rows) {
      const phone = row.phone?.trim();
      if (phone && seen.has(phone)) {
        skippedPhones.push(phone);
        continue;
      }
      if (phone) seen.add(phone);
      await this.create({ ...row, branchId });
      inserted += 1;
    }
    return { inserted, skipped: skippedPhones.length, skippedPhones };
  }
}

/** Build a fresh mock bundle. Pass seed data for tests. */
export function createMockRepositories(seed?: {
  users?: (User & { passwordHash: string })[];
  branches?: Branch[];
  customers?: Customer[];
}): RepositoryBundle {
  return {
    auth: new MockAuthRepository(),
    users: new MockUserRepository(seed?.users ?? []),
    branches: new MockBranchRepository(seed?.branches ?? []),
    customers: new MockCustomerRepository(seed?.customers ?? []),
  };
}
