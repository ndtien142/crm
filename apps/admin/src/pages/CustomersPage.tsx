import { ApiError } from '@firecare/api-client';
import type { Branch, Customer, CustomerType } from '@firecare/types';
import { Plus, Search, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { parseCsv } from '../lib/csv';
import {
  CUSTOMER_STATUSES,
  CUSTOMER_TYPES,
  customerStatusLabel,
  customerTypeLabel,
  STATUS_COLOR,
} from '../lib/labels';
import { useSession } from '../lib/session';
import { Badge, Button, Card, Input, Select, Spinner } from '../lib/ui';

const PAGE_SIZE = 20;

interface Filters {
  q: string;
  type: string;
  status: string;
  page: number;
}

export default function CustomersPage() {
  const { user } = useSession();
  const canWrite = user?.role === 'admin' || user?.role === 'staff';
  const canDelete = user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const [filters, setFilters] = useState<Filters>({ q: '', type: '', status: '', page: 1 });
  const [qInput, setQInput] = useState('');
  const [data, setData] = useState<{ items: Customer[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [adminBranchId, setAdminBranchId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdmin) api.listBranches({ pageSize: 100 }).then((r) => setBranches(r.items)).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    setLoading(true);
    api
      .listCustomers({
        page: filters.page,
        pageSize: PAGE_SIZE,
        q: filters.q || undefined,
        type: (filters.type as CustomerType) || undefined,
        status: filters.status || undefined,
      })
      .then((r) => setData({ items: r.items, total: r.meta.total }))
      .catch(() => setData({ items: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [filters]);

  function reload() {
    setFilters((f) => ({ ...f })); // trigger the effect
  }

  function requireBranch(): string | undefined {
    if (!isAdmin) return undefined; // staff → server uses their branch
    if (!adminBranchId) {
      setNotice('Vui lòng chọn chi nhánh trước.');
      throw new Error('no-branch');
    }
    return adminBranchId;
  }

  async function onImport(file: File) {
    setNotice('');
    try {
      const branchId = requireBranch();
      const { rows } = parseCsv(await file.text());
      const mapped = rows
        .map((r) => ({
          name: r.name ?? r['tên'] ?? r['ten'] ?? '',
          phone: r.phone ?? r['sdt'] ?? r['điện thoại'] ?? r['dienthoai'] ?? undefined,
          type: (r.type as CustomerType) || undefined,
          email: r.email || undefined,
          address: r.address ?? r['địa chỉ'] ?? r['diachi'] ?? undefined,
        }))
        .filter((r) => r.name);
      if (!mapped.length) {
        setNotice('Không đọc được dòng nào (cần cột "name").');
        return;
      }
      const res = await api.importCustomers({ branchId, rows: mapped });
      setNotice(`Đã nhập ${res.inserted}, bỏ qua ${res.skipped} (trùng SĐT).`);
      reload();
    } catch (err) {
      if ((err as Error).message !== 'no-branch') {
        setNotice(err instanceof ApiError ? err.message : 'Nhập thất bại');
      }
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Khách hàng</h1>
          <p className="text-sm text-slate-500">{total} khách hàng</p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Select value={adminBranchId} onChange={(e) => setAdminBranchId(e.target.value)}>
                <option value="">— Chi nhánh —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Nhập CSV
            </Button>
            <Button
              onClick={() => {
                setNotice('');
                setShowCreate(true);
              }}
            >
              <Plus className="h-4 w-4" /> Thêm khách
            </Button>
          </div>
        )}
      </div>

      {notice && (
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</div>
      )}

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setFilters((f) => ({ ...f, q: qInput, page: 1 }));
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Tìm tên, SĐT, địa chỉ (không dấu)…"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
            />
          </div>
        </form>
        <Select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, page: 1 }))}
        >
          <option value="">Tất cả loại</option>
          {CUSTOMER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <Select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
        >
          <option value="">Tất cả trạng thái</option>
          {CUSTOMER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Tên</th>
              <th className="px-4 py-3 font-medium">Loại</th>
              <th className="px-4 py-3 font-medium">Điện thoại</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium">Nhãn</th>
              {canDelete && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <Spinner className="mx-auto" />
                </td>
              </tr>
            ) : data && data.items.length > 0 ? (
              data.items.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{c.name}</div>
                    {c.address && <div className="text-xs text-slate-500">{c.address}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{customerTypeLabel(c.type)}</td>
                  <td className="px-4 py-3 text-slate-600">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color={STATUS_COLOR[c.status]}>{customerStatusLabel(c.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                    </div>
                  </td>
                  {canDelete && (
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-slate-400 hover:text-red-600"
                        title="Xoá"
                        onClick={async () => {
                          if (!confirm(`Xoá khách hàng "${c.name}"?`)) return;
                          await api.deleteCustomer(c.id);
                          reload();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  Không có khách hàng nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
        <span>
          Trang {filters.page}/{pageCount}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={filters.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            disabled={filters.page >= pageCount}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
          >
            Sau
          </Button>
        </div>
      </div>

      {showCreate && (
        <CreateCustomerModal
          isAdmin={isAdmin}
          branchId={adminBranchId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            reload();
          }}
          onNeedBranch={() => setNotice('Vui lòng chọn chi nhánh trước.')}
        />
      )}
    </div>
  );
}

function CreateCustomerModal({
  isAdmin,
  branchId,
  onClose,
  onCreated,
  onNeedBranch,
}: {
  isAdmin: boolean;
  branchId: string;
  onClose: () => void;
  onCreated: () => void;
  onNeedBranch: () => void;
}) {
  const [form, setForm] = useState({ name: '', phone: '', type: 'individual', address: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isAdmin && !branchId) {
      onNeedBranch();
      onClose();
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.createCustomer({
        name: form.name,
        phone: form.phone || undefined,
        type: form.type,
        address: form.address || undefined,
        ...(isAdmin ? { branchId } : {}),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tạo thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-6" >
        <div onClick={(e) => e.stopPropagation()}>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Thêm khách hàng</h2>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tên *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Điện thoại</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Loại</label>
                <Select
                  className="w-full"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {CUSTOMER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Địa chỉ</label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Huỷ
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Đang lưu…' : 'Lưu'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
