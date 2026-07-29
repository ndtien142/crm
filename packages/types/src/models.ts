/**
 * Domain models + string-literal enums. These unions are kept in lockstep with
 * the Drizzle `pgEnum`s in `@firecare/db`. Timestamps are ISO strings (the DB
 * returns them in `mode: 'string'`).
 */

// ── Roles & identity ────────────────────────────────────────────────────────

/** Staff roles. `staff` covers field workers (shipper) via `isFieldStaff`. */
export type Role = 'admin' | 'accountant' | 'staff';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string | null;
  ward: string | null;
  district: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  /** Link to a Google Business Profile location id (used in the later GBP phase). */
  googleLocationId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** `null` for admin = all branches. Non-admin roles are scoped to one branch. */
  branchId: string | null;
  phone: string | null;
  /** Marks a "shipper" — a staff member who performs field jobs (deliver/service). */
  isFieldStaff: boolean;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Customers ───────────────────────────────────────────────────────────────

export type CustomerType =
  | 'individual'
  | 'business'
  | 'restaurant'
  | 'factory'
  | 'building'
  | 'school'
  | 'other';

export type CustomerSource =
  | 'manual'
  | 'import'
  | 'referral'
  | 'google'
  | 'zalo'
  | 'hotline'
  | 'other';

export type CustomerStatus = 'prospect' | 'active' | 'inactive' | 'lost';

export interface Customer {
  id: string;
  branchId: string;
  code: string | null;
  type: CustomerType;
  name: string;
  phone: string | null;
  altPhone: string | null;
  email: string | null;
  taxCode: string | null;
  address: string | null;
  ward: string | null;
  district: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  source: CustomerSource;
  tags: string[];
  /** The staff member who owns this customer relationship (care assignee default). */
  assignedStaffId: string | null;
  status: CustomerStatus;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Sites (địa điểm / tòa nhà của khách) ─────────────────────────────────────

export type SiteType = 'building' | 'factory' | 'restaurant' | 'school' | 'office' | 'other';

export interface Site {
  id: string;
  branchId: string;
  customerId: string;
  name: string;
  code: string | null;
  type: SiteType;
  address: string | null;
  ward: string | null;
  district: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Assets (thiết bị PCCC) ───────────────────────────────────────────────────

export type AssetCategory =
  | 'extinguisher' // bình chữa cháy
  | 'alarm_panel' // tủ trung tâm báo cháy
  | 'detector' // đầu báo khói/nhiệt
  | 'hydrant' // họng nước
  | 'sprinkler' // đầu phun
  | 'emergency_light' // đèn thoát hiểm/sự cố
  | 'hose' // vòi/cuộn vòi
  | 'pump' // máy bơm
  | 'other';

export type AssetStatus = 'active' | 'inactive' | 'faulty' | 'retired' | 'pending';

export interface Asset {
  id: string;
  branchId: string;
  siteId: string;
  customerId: string;
  category: AssetCategory;
  name: string;
  serialNo: string | null;
  /** Human QR payload printed on the device tag (unique per branch). */
  qrCode: string;
  manufacturer: string | null;
  capacity: string | null;
  manufactureDate: string | null;
  installedAt: string | null;
  lastInspectedAt: string | null;
  /** Next inspection/refill due — drives the alert/re-service engine (P3–P5). */
  nextDueDate: string | null;
  status: AssetStatus;
  locationNote: string | null;
  photoUrl: string | null;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Inspections / kiểm định (P3) ─────────────────────────────────────────────

export type InspectionType = 'routine' | 'annual' | 'fire_drill' | 'electrical' | 'kiem_dinh' | 'other';
export type InspectionStatus = 'scheduled' | 'in_progress' | 'passed' | 'failed' | 'canceled';
export type InspectionPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ChecklistItem {
  key: string;
  label: string;
}

/** Reusable checklist (company-wide, not branch-scoped). */
export interface ChecklistTemplate {
  id: string;
  name: string;
  inspectionType: InspectionType;
  /** null = applies to any asset category. */
  assetCategory: AssetCategory | null;
  items: ChecklistItem[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionResultItem {
  key: string;
  label: string;
  pass: boolean;
  note?: string;
}

export interface InspectionEvidence {
  url: string;
  caption?: string;
}

export interface Inspection {
  id: string;
  branchId: string;
  siteId: string;
  /** null = a site-level inspection (e.g. fire drill), not tied to one device. */
  assetId: string | null;
  customerId: string;
  code: string;
  type: InspectionType;
  templateId: string | null;
  inspectorId: string | null;
  scheduledDate: string | null;
  performedDate: string | null;
  status: InspectionStatus;
  priority: InspectionPriority;
  result: InspectionResultItem[];
  evidence: InspectionEvidence[];
  notes: string | null;
  nextDueDate: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Faults & Repairs / sự cố (P4) ────────────────────────────────────────────

export type FaultSeverity = 'low' | 'medium' | 'high';
export type FaultStatus = 'open' | 'in_repair' | 'resolved';

export interface Fault {
  id: string;
  branchId: string;
  assetId: string;
  siteId: string;
  customerId: string;
  /** The inspection that surfaced this fault, if any. */
  inspectionId: string | null;
  severity: FaultSeverity;
  description: string;
  status: FaultStatus;
  assigneeId: string | null;
  foundAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Service catalog & orders / phiếu dịch vụ (P5) ────────────────────────────

export type ServiceCategory =
  | 'refill_replace' // đổi/thay bình
  | 'maintenance' // bảo trì
  | 'recharge' // nạp sạc
  | 'inspection' // kiểm định (dịch vụ)
  | 'install' // lắp đặt
  | 'training' // tập huấn
  | 'other';

export interface ServiceCatalogItem {
  id: string;
  code: string | null;
  name: string;
  category: ServiceCategory;
  /** Re-service interval in months (drives the order's nextDueDate). */
  defaultCycleMonths: number | null;
  unit: string | null;
  unitPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ServiceOrderStatus = 'draft' | 'scheduled' | 'in_progress' | 'done' | 'canceled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface ServiceOrderLine {
  id: string;
  orderId: string;
  serviceId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
  cycleMonths: number | null;
  /** performedAt + cycleMonths — computed when the order is completed. */
  lineDueDate: string | null;
}

export interface ServiceOrder {
  id: string;
  branchId: string;
  customerId: string;
  siteId: string | null;
  code: string;
  status: ServiceOrderStatus;
  scheduledAt: string | null;
  performedAt: string | null;
  performedById: string | null;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  nextDueDate: string | null;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  /** Populated by findById; omitted from list rows. */
  lines?: ServiceOrderLine[];
}
