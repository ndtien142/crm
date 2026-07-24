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

export const STATUS_COLOR: Record<CustomerStatus, 'green' | 'slate' | 'red' | 'blue'> = {
  active: 'green',
  prospect: 'blue',
  inactive: 'slate',
  lost: 'red',
};
