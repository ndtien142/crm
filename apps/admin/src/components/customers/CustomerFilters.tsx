import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@firecare/ui';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { CUSTOMER_STATUSES, CUSTOMER_TYPES } from '../../lib/labels';

export interface CustomerFilterValue {
  q?: string;
  type?: string;
  status?: string;
}

export function CustomerFilters({
  value,
  onChange,
}: {
  value: CustomerFilterValue;
  onChange: (patch: CustomerFilterValue) => void;
}) {
  const [q, setQ] = useState(value.q ?? '');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="relative min-w-[240px] flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          onChange({ q });
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Tìm tên, SĐT, địa chỉ (không dấu)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>

      <Select
        value={value.type || 'all'}
        onValueChange={(v) => onChange({ type: v === 'all' ? '' : v })}
      >
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Loại" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả loại</SelectItem>
          {CUSTOMER_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.status || 'all'}
        onValueChange={(v) => onChange({ status: v === 'all' ? '' : v })}
      >
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          {CUSTOMER_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
