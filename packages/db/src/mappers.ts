/**
 * Row → domain mappers. Keeps repositories query-focused and guarantees the
 * public shape (e.g. `User` never carries `passwordHash`).
 */

import type { Branch, Customer, User } from '@firecare/types';
import type { branches, customers, users } from './schema';

type BranchRow = typeof branches.$inferSelect;
type UserRow = typeof users.$inferSelect;
type CustomerRow = typeof customers.$inferSelect;

export function toBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    address: row.address,
    ward: row.ward,
    district: row.district,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    phone: row.phone,
    email: row.email,
    googleLocationId: row.googleLocationId,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    branchId: row.branchId,
    phone: row.phone,
    isFieldStaff: row.isFieldStaff,
    avatarUrl: row.avatarUrl,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    branchId: row.branchId,
    code: row.code,
    type: row.type,
    name: row.name,
    phone: row.phone,
    altPhone: row.altPhone,
    email: row.email,
    taxCode: row.taxCode,
    address: row.address,
    ward: row.ward,
    district: row.district,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    source: row.source,
    tags: row.tags,
    assignedStaffId: row.assignedStaffId,
    status: row.status,
    notes: row.notes,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
