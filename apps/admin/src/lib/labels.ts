import type { CustomerStatus, CustomerType } from '@firecare/types';

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
