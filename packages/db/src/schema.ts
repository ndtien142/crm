/**
 * Drizzle schema (single file). DB is snake_case, TS is camelCase (`casing:
 * 'snake_case'` in the client). `pgEnum`s mirror the string-literal unions in
 * `@firecare/types`. PostGIS `geog` + generated `search_text` columns and their
 * indexes live in `sql/postgis.sql` (applied via `pnpm db:extras`), not here.
 */

import { sql } from 'drizzle-orm';
import {
  boolean,
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
