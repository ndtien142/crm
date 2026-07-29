/**
 * Drizzle schema (single file). DB is snake_case, TS is camelCase (`casing:
 * 'snake_case'` in the client). `pgEnum`s mirror the string-literal unions in
 * `@firecare/types`. PostGIS `geog` + generated `search_text` columns and their
 * indexes live in `sql/postgis.sql` (applied via `pnpm db:extras`), not here.
 */

import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// ── Enums ───────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum('role', ['admin', 'accountant', 'staff']);

export const customerTypeEnum = pgEnum('customer_type', [
  'individual',
  'business',
  'restaurant',
  'factory',
  'building',
  'school',
  'other',
]);

export const customerSourceEnum = pgEnum('customer_source', [
  'manual',
  'import',
  'referral',
  'google',
  'zalo',
  'hotline',
  'other',
]);

export const customerStatusEnum = pgEnum('customer_status', [
  'prospect',
  'active',
  'inactive',
  'lost',
]);

// ── Reusable column groups ──────────────────────────────────────────────────

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
};

const id = uuid('id')
  .primaryKey()
  .default(sql`gen_random_uuid()`);

// ── Branches ────────────────────────────────────────────────────────────────

export const branches = pgTable('branches', {
  id,
  code: text('code').notNull(),
  name: text('name').notNull(),
  address: text('address'),
  ward: text('ward'),
  district: text('district'),
  city: text('city'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  phone: text('phone'),
  email: text('email'),
  googleLocationId: text('google_location_id'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

// ── Users (staff) ───────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id,
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: roleEnum('role').notNull(),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    phone: text('phone'),
    isFieldStaff: boolean('is_field_staff').notNull().default(false),
    avatarUrl: text('avatar_url'),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('users_email_idx').on(sql`lower(${t.email})`)],
);

// ── Refresh sessions (rotating opaque tokens) ───────────────────────────────

export const refreshSessions = pgTable(
  'refresh_sessions',
  {
    id,
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex('refresh_sessions_token_hash_idx').on(t.tokenHash)],
);

// ── Customers ───────────────────────────────────────────────────────────────

export const customers = pgTable(
  'customers',
  {
    id,
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    code: text('code'),
    type: customerTypeEnum('type').notNull().default('individual'),
    name: text('name').notNull(),
    phone: text('phone'),
    altPhone: text('alt_phone'),
    email: text('email'),
    taxCode: text('tax_code'),
    address: text('address'),
    ward: text('ward'),
    district: text('district'),
    city: text('city'),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    source: customerSourceEnum('source').notNull().default('manual'),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    assignedStaffId: uuid('assigned_staff_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    status: customerStatusEnum('status').notNull().default('active'),
    notes: text('notes'),
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    index('customers_branch_idx').on(t.branchId),
    index('customers_phone_idx').on(t.phone),
  ],
);

// ── Sites & Assets (P2) ─────────────────────────────────────────────────────

export const siteTypeEnum = pgEnum('site_type', [
  'building',
  'factory',
  'restaurant',
  'school',
  'office',
  'other',
]);

export const assetCategoryEnum = pgEnum('asset_category', [
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

export const assetStatusEnum = pgEnum('asset_status', [
  'active',
  'inactive',
  'faulty',
  'retired',
  'pending',
]);

export const sites = pgTable(
  'sites',
  {
    id,
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    code: text('code'),
    type: siteTypeEnum('type').notNull().default('building'),
    address: text('address'),
    ward: text('ward'),
    district: text('district'),
    city: text('city'),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    notes: text('notes'),
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('sites_branch_idx').on(t.branchId), index('sites_customer_idx').on(t.customerId)],
);

export const assets = pgTable(
  'assets',
  {
    id,
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    category: assetCategoryEnum('category').notNull().default('extinguisher'),
    name: text('name').notNull(),
    serialNo: text('serial_no'),
    qrCode: text('qr_code').notNull(),
    manufacturer: text('manufacturer'),
    capacity: text('capacity'),
    manufactureDate: date('manufacture_date', { mode: 'string' }),
    installedAt: date('installed_at', { mode: 'string' }),
    lastInspectedAt: date('last_inspected_at', { mode: 'string' }),
    nextDueDate: date('next_due_date', { mode: 'string' }),
    status: assetStatusEnum('status').notNull().default('active'),
    locationNote: text('location_note'),
    photoUrl: text('photo_url'),
    notes: text('notes'),
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    index('assets_site_idx').on(t.siteId),
    index('assets_branch_idx').on(t.branchId),
    index('assets_next_due_idx').on(t.nextDueDate),
    uniqueIndex('assets_qr_branch_idx').on(t.branchId, t.qrCode),
  ],
);
