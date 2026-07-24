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
