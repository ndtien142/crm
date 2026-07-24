/**
 * The `RepositoryBundle` is the single seam between HTTP routes and the data
 * layer. Two implementations satisfy it: an in-memory mock (`@firecare/core`,
 * for tests/dev) and Postgres (`@firecare/db`). Routes never know which is live.
 */

import type {
  Branch,
  Customer,
  CustomerSource,
  CustomerStatus,
  CustomerType,
  Role,
  User,
} from './models';

// ── Shared query primitives ─────────────────────────────────────────────────

export interface PageQuery {
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
}

/**
 * Row-visibility scope derived from the principal. `allBranches` (admin,
 * accountant) sees everything; otherwise queries are constrained to `branchId`.
 * Repositories inject this into their WHERE clause — the IDOR/branch guard.
 */
export interface BranchScope {
  allBranches: boolean;
  branchId?: string;
}

// ── Auth / refresh sessions ─────────────────────────────────────────────────

export interface RefreshSession {
  id: string;
  userId: string;
  /** SHA-256 of the opaque refresh token — the raw token is never stored. */
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface AuthRepository {
  createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<RefreshSession>;
  findSessionByHash(tokenHash: string): Promise<RefreshSession | null>;
  revokeSession(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

// ── Users ───────────────────────────────────────────────────────────────────

export interface NewUser {
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  branchId: string | null;
  phone?: string | null;
  isFieldStaff?: boolean;
}

export interface UpdateUser {
  name?: string;
  role?: Role;
  branchId?: string | null;
  phone?: string | null;
  isFieldStaff?: boolean;
  avatarUrl?: string | null;
}

export interface UserRepository {
  list(query: PageQuery & { role?: Role; branchId?: string; q?: string }): Promise<Paginated<User>>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  /** Auth-only lookup that also returns the password hash. */
  findAuthByEmail(email: string): Promise<{ user: User; passwordHash: string } | null>;
  create(input: NewUser): Promise<User>;
  update(id: string, patch: UpdateUser): Promise<User | null>;
  setActive(id: string, isActive: boolean): Promise<User | null>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
}

// ── Branches ────────────────────────────────────────────────────────────────

export interface NewBranch {
  code: string;
  name: string;
  address?: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  email?: string | null;
}

export type UpdateBranch = Partial<NewBranch>;

export interface BranchRepository {
  list(query: PageQuery & { q?: string; includeInactive?: boolean }): Promise<Paginated<Branch>>;
  findById(id: string): Promise<Branch | null>;
  findByCode(code: string): Promise<Branch | null>;
  create(input: NewBranch): Promise<Branch>;
  update(id: string, patch: UpdateBranch): Promise<Branch | null>;
  setActive(id: string, isActive: boolean): Promise<Branch | null>;
}

// ── Customers ───────────────────────────────────────────────────────────────

export interface NewCustomer {
  branchId: string;
  code?: string | null;
  type: CustomerType;
  name: string;
  phone?: string | null;
  altPhone?: string | null;
  email?: string | null;
  taxCode?: string | null;
  address?: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  source?: CustomerSource;
  tags?: string[];
  assignedStaffId?: string | null;
  status?: CustomerStatus;
  notes?: string | null;
  createdById?: string | null;
}

export type UpdateCustomer = Partial<Omit<NewCustomer, 'branchId' | 'createdById'>>;

export interface CustomerListQuery extends PageQuery {
  scope: BranchScope;
  q?: string;
  type?: CustomerType;
  status?: CustomerStatus;
  tag?: string;
  assignedStaffId?: string;
  sort?: 'recent' | 'name';
}

export interface CustomerRepository {
  list(query: CustomerListQuery): Promise<Paginated<Customer>>;
  findById(id: string, scope: BranchScope): Promise<Customer | null>;
  create(input: NewCustomer): Promise<Customer>;
  update(id: string, patch: UpdateCustomer, scope: BranchScope): Promise<Customer | null>;
  delete(id: string, scope: BranchScope): Promise<boolean>;
  /**
   * Bulk insert for CSV import. De-dups by phone within the branch and skips
   * rows that already exist. Returns which rows were inserted vs skipped.
   */
  bulkCreate(
    branchId: string,
    rows: NewCustomer[],
  ): Promise<{ inserted: number; skipped: number; skippedPhones: string[] }>;
}

// ── The bundle ──────────────────────────────────────────────────────────────

export interface RepositoryBundle {
  auth: AuthRepository;
  users: UserRepository;
  branches: BranchRepository;
  customers: CustomerRepository;
}
