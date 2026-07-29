/** Zod request schemas — the single validation layer for route inputs. */

import { z } from 'zod';

const roleSchema = z.enum(['admin', 'accountant', 'staff']);
const customerTypeSchema = z.enum([
  'individual',
  'business',
  'restaurant',
  'factory',
  'building',
  'school',
  'other',
]);
const customerSourceSchema = z.enum([
  'manual',
  'import',
  'referral',
  'google',
  'zalo',
  'hotline',
  'other',
]);
const customerStatusSchema = z.enum(['prospect', 'active', 'inactive', 'lost']);

/** Shared page/limit query with sane caps. */
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ── Users ───────────────────────────────────────────────────────────────────

export const userQuerySchema = pageQuerySchema.extend({
  role: roleSchema.optional(),
  branchId: z.string().uuid().optional(),
  q: z.string().trim().min(1).optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().trim().min(1),
  role: roleSchema,
  branchId: z.string().uuid().nullable().optional(),
  phone: z.string().trim().optional(),
  isFieldStaff: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  role: roleSchema.optional(),
  branchId: z.string().uuid().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  isFieldStaff: z.boolean().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6),
});

// ── Branches ────────────────────────────────────────────────────────────────

export const branchQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  includeInactive: z.coerce.boolean().optional(),
});

export const createBranchSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  address: z.string().trim().optional(),
  ward: z.string().trim().optional(),
  district: z.string().trim().optional(),
  city: z.string().trim().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  phone: z.string().trim().optional(),
  email: z.string().email().optional(),
});

export const updateBranchSchema = createBranchSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ── Customers ───────────────────────────────────────────────────────────────

export const customerQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  type: customerTypeSchema.optional(),
  status: customerStatusSchema.optional(),
  tag: z.string().trim().min(1).optional(),
  assignedStaffId: z.string().uuid().optional(),
  sort: z.enum(['recent', 'name']).optional(),
});

const customerBodyBase = {
  code: z.string().trim().optional(),
  type: customerTypeSchema.default('individual'),
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  altPhone: z.string().trim().optional(),
  email: z.string().email().optional(),
  taxCode: z.string().trim().optional(),
  address: z.string().trim().optional(),
  ward: z.string().trim().optional(),
  district: z.string().trim().optional(),
  city: z.string().trim().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  source: customerSourceSchema.optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  assignedStaffId: z.string().uuid().nullable().optional(),
  status: customerStatusSchema.optional(),
  notes: z.string().trim().optional(),
};

export const createCustomerSchema = z.object({
  // Admin supplies a branch; staff's branch is taken from their principal.
  branchId: z.string().uuid().optional(),
  ...customerBodyBase,
});

export const updateCustomerSchema = z.object(customerBodyBase).partial();

/** CSV import: the client parses the file and posts structured rows. */
export const customerImportSchema = z.object({
  branchId: z.string().uuid().optional(),
  rows: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        phone: z.string().trim().optional(),
        type: customerTypeSchema.optional(),
        email: z.string().email().optional(),
        address: z.string().trim().optional(),
        taxCode: z.string().trim().optional(),
        tags: z.array(z.string().trim().min(1)).optional(),
      }),
    )
    .min(1)
    .max(2000),
});

// ── Sites (địa điểm) ─────────────────────────────────────────────────────────

const siteTypeSchema = z.enum(['building', 'factory', 'restaurant', 'school', 'office', 'other']);

export const siteQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  customerId: z.string().uuid().optional(),
  type: siteTypeSchema.optional(),
});

export const createSiteSchema = z.object({
  // The site inherits its branch from the customer; only the customer is named.
  customerId: z.string().uuid(),
  name: z.string().trim().min(1),
  code: z.string().trim().optional(),
  type: siteTypeSchema.default('building'),
  address: z.string().trim().optional(),
  ward: z.string().trim().optional(),
  district: z.string().trim().optional(),
  city: z.string().trim().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  notes: z.string().trim().optional(),
});

export const updateSiteSchema = createSiteSchema.omit({ customerId: true }).partial();

// ── Assets (thiết bị) ────────────────────────────────────────────────────────

const assetCategorySchema = z.enum([
  'extinguisher',
  'alarm_panel',
  'detector',
  'hydrant',
  'sprinkler',
  'emergency_light',
  'hose',
  'pump',
  'other',
]);
const assetStatusSchema = z.enum(['active', 'inactive', 'faulty', 'retired', 'pending']);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải dạng YYYY-MM-DD');

export const assetQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  siteId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  category: assetCategorySchema.optional(),
  status: assetStatusSchema.optional(),
  dueBefore: dateStr.optional(),
  sort: z.enum(['recent', 'due']).optional(),
});

const assetBodyBase = {
  category: assetCategorySchema.default('extinguisher'),
  name: z.string().trim().min(1),
  serialNo: z.string().trim().optional(),
  qrCode: z.string().trim().optional(),
  manufacturer: z.string().trim().optional(),
  capacity: z.string().trim().optional(),
  manufactureDate: dateStr.optional(),
  installedAt: dateStr.optional(),
  lastInspectedAt: dateStr.optional(),
  nextDueDate: dateStr.optional(),
  status: assetStatusSchema.optional(),
  locationNote: z.string().trim().optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().trim().optional(),
};

export const createAssetSchema = z.object({
  // Branch + customer are derived from the site.
  siteId: z.string().uuid(),
  ...assetBodyBase,
});

export const updateAssetSchema = z.object(assetBodyBase).partial();

export const assetImportSchema = z.object({
  siteId: z.string().uuid(),
  rows: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        category: assetCategorySchema.optional(),
        serialNo: z.string().trim().optional(),
        manufacturer: z.string().trim().optional(),
        capacity: z.string().trim().optional(),
        manufactureDate: dateStr.optional(),
        nextDueDate: dateStr.optional(),
        locationNote: z.string().trim().optional(),
      }),
    )
    .min(1)
    .max(2000),
});
