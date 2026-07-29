import type { Customer } from '@firecare/types';
import {
  Button,
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@firecare/ui';
import { useState } from 'react';
import { CreateCustomerDialog } from '../components/customers/CreateCustomerDialog';
import { CustomerFilters, type CustomerFilterValue } from '../components/customers/CustomerFilters';
import { CustomerTable } from '../components/customers/CustomerTable';
import { ImportCustomers } from '../components/customers/ImportCustomers';
import { useBranches, useCustomers, useDeleteCustomer } from '../lib/queries';
import { useAuth } from '../store/auth';

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const role = useAuth((s) => s.user?.role);
  const isAdmin = role === 'admin';
  const canWrite = role === 'admin' || role === 'staff';
  const canDelete = role === 'admin';

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<CustomerFilterValue>({});
  const [adminBranchId, setAdminBranchId] = useState('');

  const branches = useBranches();
  const query = useCustomers({ page, pageSize: PAGE_SIZE, ...filters });
  const del = useDeleteCustomer();

  const items = query.data?.items ?? [];
  const total = query.data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function onFilter(patch: CustomerFilterValue) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }

  async function onDelete(c: Customer) {
    if (!confirm(`Xoá khách hàng "${c.name}"?`)) return;
    try {
      await del.mutateAsync(c.id);
      toast.success('Đã xoá khách hàng');
    } catch {
      toast.error('Xoá thất bại');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Khách hàng</h1>
          <p className="text-sm text-muted-foreground">{total} khách hàng</p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Select
                value={adminBranchId || 'none'}
                onValueChange={(v) => setAdminBranchId(v === 'none' ? '' : v)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="— Chi nhánh —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Chi nhánh —</SelectItem>
                  {(branches.data?.items ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <ImportCustomers isAdmin={isAdmin} branchId={adminBranchId} />
            <CreateCustomerDialog isAdmin={isAdmin} branchId={adminBranchId} />
          </div>
        )}
      </div>

      <Card className="p-3">
        <CustomerFilters value={filters} onChange={onFilter} />
      </Card>

      <Card className="overflow-hidden py-0">
        <CustomerTable
          items={items}
          loading={query.isLoading}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Trang {page}/{pageCount}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
