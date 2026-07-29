import type {
  AssetCategory,
  AssetStatus,
  CustomerStatus,
  CustomerType,
  InspectionPriority,
  InspectionStatus,
  InspectionType,
  SiteType,
} from '@firecare/types';

export const CUSTOMER_TYPES: { value: CustomerType; label: string }[] = [
  { value: 'individual', label: 'Cá nhân' },
  { value: 'business', label: 'Doanh nghiệp' },
  { value: 'restaurant', label: 'Nhà hàng/Quán ăn' },
  { value: 'factory', label: 'Nhà xưởng' },
  { value: 'building', label: 'Tòa nhà' },
  { value: 'school', label: 'Trường học' },
  { value: 'other', label: 'Khác' },
];

export const CUSTOMER_STATUSES: { value: CustomerStatus; label: string }[] = [
  { value: 'prospect', label: 'Tiềm năng' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'inactive', label: 'Ngừng' },
  { value: 'lost', label: 'Đã mất' },
];

const typeMap = Object.fromEntries(CUSTOMER_TYPES.map((t) => [t.value, t.label]));
const statusMap = Object.fromEntries(CUSTOMER_STATUSES.map((s) => [s.value, s.label]));

export const customerTypeLabel = (t: CustomerType) => typeMap[t] ?? t;
export const customerStatusLabel = (s: CustomerStatus) => statusMap[s] ?? s;

/** Tailwind classes for a status badge (light + dark). */
export const STATUS_BADGE: Record<CustomerStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  prospect: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
  lost: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

// ── Sites & Assets (P2) ─────────────────────────────────────────────────────

export const SITE_TYPES: { value: SiteType; label: string }[] = [
  { value: 'building', label: 'Tòa nhà' },
  { value: 'factory', label: 'Nhà xưởng' },
  { value: 'restaurant', label: 'Nhà hàng/Quán ăn' },
  { value: 'school', label: 'Trường học' },
  { value: 'office', label: 'Văn phòng' },
  { value: 'other', label: 'Khác' },
];

export const ASSET_CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: 'extinguisher', label: 'Bình chữa cháy' },
  { value: 'alarm_panel', label: 'Tủ báo cháy' },
  { value: 'detector', label: 'Đầu báo' },
  { value: 'hydrant', label: 'Họng nước' },
  { value: 'sprinkler', label: 'Đầu phun' },
  { value: 'emergency_light', label: 'Đèn thoát hiểm' },
  { value: 'hose', label: 'Vòi/cuộn vòi' },
  { value: 'pump', label: 'Máy bơm' },
  { value: 'other', label: 'Khác' },
];

export const ASSET_STATUSES: { value: AssetStatus; label: string }[] = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'inactive', label: 'Ngừng' },
  { value: 'faulty', label: 'Lỗi' },
  { value: 'retired', label: 'Loại bỏ' },
  { value: 'pending', label: 'Chờ kích hoạt' },
];

const siteTypeMap = Object.fromEntries(SITE_TYPES.map((t) => [t.value, t.label]));
const assetCategoryMap = Object.fromEntries(ASSET_CATEGORIES.map((t) => [t.value, t.label]));
const assetStatusMap = Object.fromEntries(ASSET_STATUSES.map((t) => [t.value, t.label]));

export const siteTypeLabel = (t: SiteType) => siteTypeMap[t] ?? t;
export const assetCategoryLabel = (c: AssetCategory) => assetCategoryMap[c] ?? c;
export const assetStatusLabel = (s: AssetStatus) => assetStatusMap[s] ?? s;

export const ASSET_STATUS_BADGE: Record<AssetStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
  faulty: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  retired: 'bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
};

// ── Inspections (P3) ────────────────────────────────────────────────────────

export const INSPECTION_TYPES: { value: InspectionType; label: string }[] = [
  { value: 'routine', label: 'Định kỳ' },
  { value: 'annual', label: 'Hàng năm' },
  { value: 'fire_drill', label: 'Diễn tập PCCC' },
  { value: 'electrical', label: 'Hệ thống điện' },
  { value: 'kiem_dinh', label: 'Kiểm định' },
  { value: 'other', label: 'Khác' },
];

export const INSPECTION_STATUSES: { value: InspectionStatus; label: string }[] = [
  { value: 'scheduled', label: 'Đã lên lịch' },
  { value: 'in_progress', label: 'Đang thực hiện' },
  { value: 'passed', label: 'Đạt' },
  { value: 'failed', label: 'Không đạt' },
  { value: 'canceled', label: 'Đã huỷ' },
];

export const INSPECTION_PRIORITIES: { value: InspectionPriority; label: string }[] = [
  { value: 'low', label: 'Thấp' },
  { value: 'normal', label: 'Bình thường' },
  { value: 'high', label: 'Cao' },
  { value: 'urgent', label: 'Khẩn' },
];

const inspTypeMap = Object.fromEntries(INSPECTION_TYPES.map((t) => [t.value, t.label]));
const inspStatusMap = Object.fromEntries(INSPECTION_STATUSES.map((t) => [t.value, t.label]));
const inspPriorityMap = Object.fromEntries(INSPECTION_PRIORITIES.map((t) => [t.value, t.label]));

export const inspectionTypeLabel = (t: InspectionType) => inspTypeMap[t] ?? t;
export const inspectionStatusLabel = (s: InspectionStatus) => inspStatusMap[s] ?? s;
export const inspectionPriorityLabel = (p: InspectionPriority) => inspPriorityMap[p] ?? p;

export const INSPECTION_STATUS_BADGE: Record<InspectionStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  passed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  canceled: 'bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400',
};

export const INSPECTION_PRIORITY_BADGE: Record<InspectionPriority, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
  normal: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};
