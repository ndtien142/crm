/**
 * Row → domain mappers. Keeps repositories query-focused and guarantees the
 * public shape (e.g. `User` never carries `passwordHash`).
 */

import type {
  Asset,
  Branch,
  ChecklistTemplate,
  Customer,
  Inspection,
  Site,
  User,
} from '@firecare/types';
// Value import (not `import type`): the table objects back the `$inferSelect` row types.
import {
  assets,
  branches,
  checklistTemplates,
  customers,
  inspections,
  sites,
  users,
} from './schema';

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

type SiteRow = typeof sites.$inferSelect;
type AssetRow = typeof assets.$inferSelect;

export function toSite(row: SiteRow): Site {
  return {
    id: row.id,
    branchId: row.branchId,
    customerId: row.customerId,
    name: row.name,
    code: row.code,
    type: row.type,
    address: row.address,
    ward: row.ward,
    district: row.district,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    notes: row.notes,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    branchId: row.branchId,
    siteId: row.siteId,
    customerId: row.customerId,
    category: row.category,
    name: row.name,
    serialNo: row.serialNo,
    qrCode: row.qrCode,
    manufacturer: row.manufacturer,
    capacity: row.capacity,
    manufactureDate: row.manufactureDate,
    installedAt: row.installedAt,
    lastInspectedAt: row.lastInspectedAt,
    nextDueDate: row.nextDueDate,
    status: row.status,
    locationNote: row.locationNote,
    photoUrl: row.photoUrl,
    notes: row.notes,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

type ChecklistTemplateRow = typeof checklistTemplates.$inferSelect;
type InspectionRow = typeof inspections.$inferSelect;

export function toChecklistTemplate(row: ChecklistTemplateRow): ChecklistTemplate {
  return {
    id: row.id,
    name: row.name,
    inspectionType: row.inspectionType,
    assetCategory: row.assetCategory,
    items: row.items,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toInspection(row: InspectionRow): Inspection {
  return {
    id: row.id,
    branchId: row.branchId,
    siteId: row.siteId,
    assetId: row.assetId,
    customerId: row.customerId,
    code: row.code,
    type: row.type,
    templateId: row.templateId,
    inspectorId: row.inspectorId,
    scheduledDate: row.scheduledDate,
    performedDate: row.performedDate,
    status: row.status,
    priority: row.priority,
    result: row.result,
    evidence: row.evidence,
    notes: row.notes,
    nextDueDate: row.nextDueDate,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
