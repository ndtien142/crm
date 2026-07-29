/**
 * The `RepositoryBundle` is the single seam between HTTP routes and the data
 * layer. Two implementations satisfy it: an in-memory mock (`@firecare/core`,
 * for tests/dev) and Postgres (`@firecare/db`). Routes never know which is live.
 */

import type {
  Asset,
  AssetCategory,
  AssetStatus,
  Branch,
  ChecklistItem,
  ChecklistTemplate,
  Customer,
  CustomerSource,
  CustomerStatus,
  CustomerType,
  Fault,
  FaultSeverity,
  FaultStatus,
  Inspection,
  InspectionEvidence,
  InspectionPriority,
  InspectionResultItem,
  InspectionStatus,
  InspectionType,
  PaymentStatus,
  Role,
  ServiceCatalogItem,
  ServiceCategory,
  ServiceOrder,
  ServiceOrderStatus,
  Site,
  SiteType,
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

// ── Sites ───────────────────────────────────────────────────────────────────

export interface NewSite {
  branchId: string;
  customerId: string;
  name: string;
  code?: string | null;
  type?: SiteType;
  address?: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  notes?: string | null;
  createdById?: string | null;
}

export type UpdateSite = Partial<Omit<NewSite, 'branchId' | 'customerId' | 'createdById'>>;

export interface SiteListQuery extends PageQuery {
  scope: BranchScope;
  q?: string;
  customerId?: string;
  type?: SiteType;
}

export interface SiteRepository {
  list(query: SiteListQuery): Promise<Paginated<Site>>;
  findById(id: string, scope: BranchScope): Promise<Site | null>;
  create(input: NewSite): Promise<Site>;
  update(id: string, patch: UpdateSite, scope: BranchScope): Promise<Site | null>;
  delete(id: string, scope: BranchScope): Promise<boolean>;
}

// ── Assets ──────────────────────────────────────────────────────────────────

export interface NewAsset {
  branchId: string;
  siteId: string;
  customerId: string;
  category: AssetCategory;
  name: string;
  serialNo?: string | null;
  /** Auto-generated (FC-xxxx) when omitted; never nulled once set. */
  qrCode?: string;
  manufacturer?: string | null;
  capacity?: string | null;
  manufactureDate?: string | null;
  installedAt?: string | null;
  lastInspectedAt?: string | null;
  nextDueDate?: string | null;
  status?: AssetStatus;
  locationNote?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  createdById?: string | null;
}

export type UpdateAsset = Partial<Omit<NewAsset, 'branchId' | 'customerId' | 'createdById'>>;

export interface AssetListQuery extends PageQuery {
  scope: BranchScope;
  q?: string;
  siteId?: string;
  customerId?: string;
  category?: AssetCategory;
  status?: AssetStatus;
  /** ISO date — assets whose nextDueDate is on/before this (đến hạn). */
  dueBefore?: string;
  sort?: 'recent' | 'due';
}

export interface AssetRepository {
  list(query: AssetListQuery): Promise<Paginated<Asset>>;
  findById(id: string, scope: BranchScope): Promise<Asset | null>;
  findByQr(qrCode: string, scope: BranchScope): Promise<Asset | null>;
  create(input: NewAsset): Promise<Asset>;
  update(id: string, patch: UpdateAsset, scope: BranchScope): Promise<Asset | null>;
  delete(id: string, scope: BranchScope): Promise<boolean>;
  /** Bulk import into one site; de-dups by serialNo within the site. */
  bulkCreate(
    context: { branchId: string; siteId: string; customerId: string },
    rows: NewAsset[],
  ): Promise<{ inserted: number; skipped: number; skippedRefs: string[] }>;
}

// ── Checklist templates (company-wide, not branch-scoped) ───────────────────

export interface NewChecklistTemplate {
  name: string;
  inspectionType: InspectionType;
  assetCategory?: AssetCategory | null;
  items: ChecklistItem[];
  isActive?: boolean;
}

export type UpdateChecklistTemplate = Partial<NewChecklistTemplate>;

export interface ChecklistTemplateRepository {
  list(query: {
    inspectionType?: InspectionType;
    assetCategory?: AssetCategory;
    includeInactive?: boolean;
  }): Promise<ChecklistTemplate[]>;
  findById(id: string): Promise<ChecklistTemplate | null>;
  create(input: NewChecklistTemplate): Promise<ChecklistTemplate>;
  update(id: string, patch: UpdateChecklistTemplate): Promise<ChecklistTemplate | null>;
  delete(id: string): Promise<boolean>;
}

// ── Inspections ─────────────────────────────────────────────────────────────

export interface NewInspection {
  branchId: string;
  siteId: string;
  assetId?: string | null;
  customerId: string;
  code?: string;
  type: InspectionType;
  templateId?: string | null;
  inspectorId?: string | null;
  scheduledDate?: string | null;
  performedDate?: string | null;
  status?: InspectionStatus;
  priority?: InspectionPriority;
  result?: InspectionResultItem[];
  evidence?: InspectionEvidence[];
  notes?: string | null;
  nextDueDate?: string | null;
  createdById?: string | null;
}

export type UpdateInspection = Partial<
  Omit<NewInspection, 'branchId' | 'siteId' | 'customerId' | 'createdById'>
>;

export interface InspectionListQuery extends PageQuery {
  scope: BranchScope;
  siteId?: string;
  assetId?: string;
  customerId?: string;
  type?: InspectionType;
  status?: InspectionStatus;
  inspectorId?: string;
  priority?: InspectionPriority;
  sort?: 'recent' | 'scheduled';
}

export interface InspectionRepository {
  list(query: InspectionListQuery): Promise<Paginated<Inspection>>;
  findById(id: string, scope: BranchScope): Promise<Inspection | null>;
  create(input: NewInspection): Promise<Inspection>;
  update(id: string, patch: UpdateInspection, scope: BranchScope): Promise<Inspection | null>;
  delete(id: string, scope: BranchScope): Promise<boolean>;
  /** Sweep helper: does the asset already have a scheduled/in_progress inspection? */
  hasOpenForAsset(assetId: string): Promise<boolean>;
}

// ── Faults & Repairs ────────────────────────────────────────────────────────

export interface NewFault {
  branchId: string;
  assetId: string;
  siteId: string;
  customerId: string;
  inspectionId?: string | null;
  severity?: FaultSeverity;
  description: string;
  status?: FaultStatus;
  assigneeId?: string | null;
  foundAt?: string;
  createdById?: string | null;
}

export type UpdateFault = Partial<
  Pick<NewFault, 'severity' | 'description' | 'status' | 'assigneeId'>
>;

export interface FaultListQuery extends PageQuery {
  scope: BranchScope;
  assetId?: string;
  siteId?: string;
  customerId?: string;
  status?: FaultStatus;
  severity?: FaultSeverity;
}

export interface FaultRepository {
  list(query: FaultListQuery): Promise<Paginated<Fault>>;
  findById(id: string, scope: BranchScope): Promise<Fault | null>;
  create(input: NewFault): Promise<Fault>;
  update(id: string, patch: UpdateFault, scope: BranchScope): Promise<Fault | null>;
  resolve(
    id: string,
    input: { resolvedAt: string; resolutionNote?: string | null },
    scope: BranchScope,
  ): Promise<Fault | null>;
  delete(id: string, scope: BranchScope): Promise<boolean>;
}

// ── Service catalog (company-wide) ──────────────────────────────────────────

export interface NewServiceCatalogItem {
  code?: string | null;
  name: string;
  category: ServiceCategory;
  defaultCycleMonths?: number | null;
  unit?: string | null;
  unitPrice: number;
  isActive?: boolean;
}

export type UpdateServiceCatalogItem = Partial<NewServiceCatalogItem>;

export interface ServiceCatalogRepository {
  list(query: { category?: ServiceCategory; includeInactive?: boolean }): Promise<ServiceCatalogItem[]>;
  findById(id: string): Promise<ServiceCatalogItem | null>;
  create(input: NewServiceCatalogItem): Promise<ServiceCatalogItem>;
  update(id: string, patch: UpdateServiceCatalogItem): Promise<ServiceCatalogItem | null>;
  delete(id: string): Promise<boolean>;
}

// ── Service orders (phiếu dịch vụ) ──────────────────────────────────────────

export interface NewServiceOrderLine {
  serviceId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  cycleMonths?: number | null;
}

export interface NewServiceOrder {
  branchId: string;
  customerId: string;
  siteId?: string | null;
  code?: string;
  status?: ServiceOrderStatus;
  scheduledAt?: string | null;
  notes?: string | null;
  createdById?: string | null;
}

export type UpdateServiceOrder = Partial<
  Pick<NewServiceOrder, 'status' | 'scheduledAt' | 'notes' | 'siteId'>
>;

export interface ServiceOrderListQuery extends PageQuery {
  scope: BranchScope;
  customerId?: string;
  status?: ServiceOrderStatus;
  paymentStatus?: PaymentStatus;
  sort?: 'recent' | 'due';
}

export interface ServiceOrderRepository {
  list(query: ServiceOrderListQuery): Promise<Paginated<ServiceOrder>>;
  /** Returns the order with its `lines` populated. */
  findById(id: string, scope: BranchScope): Promise<ServiceOrder | null>;
  create(order: NewServiceOrder, lines: NewServiceOrderLine[]): Promise<ServiceOrder>;
  update(id: string, patch: UpdateServiceOrder, scope: BranchScope): Promise<ServiceOrder | null>;
  /** Mark done: stamp performedAt, roll each line's due date + the order's nextDueDate. */
  complete(
    id: string,
    input: { performedAt: string; performedById?: string | null },
    scope: BranchScope,
  ): Promise<ServiceOrder | null>;
  setPayment(
    id: string,
    input: { paymentStatus: PaymentStatus; paidAmount: number },
    scope: BranchScope,
  ): Promise<ServiceOrder | null>;
  delete(id: string, scope: BranchScope): Promise<boolean>;
}

// ── The bundle ──────────────────────────────────────────────────────────────

export interface RepositoryBundle {
  auth: AuthRepository;
  users: UserRepository;
  branches: BranchRepository;
  customers: CustomerRepository;
  sites: SiteRepository;
  assets: AssetRepository;
  checklistTemplates: ChecklistTemplateRepository;
  inspections: InspectionRepository;
  faults: FaultRepository;
  serviceCatalog: ServiceCatalogRepository;
  serviceOrders: ServiceOrderRepository;
}
