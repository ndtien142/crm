import { ApiError } from '@firecare/api-client';
import type { Branch, Role, User } from '@firecare/types';
import { KeyRound, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Badge, Button, Card, Input, Select, Spinner } from '../lib/ui';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Quản trị',
  accountant: 'Kế toán',
  staff: 'Nhân viên',
};

export default function AccountsPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState('');

  function load() {
    api.listUsers({ pageSize: 100 }).then((r) => setUsers(r.items)).catch(() => setUsers([]));
  }
  useEffect(() => {
    load();
    api.listBranches({ pageSize: 100 }).then((r) => setBranches(r.items)).catch(() => {});
  }, []);

  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? '—';

  async function resetPassword(u: User) {
    const pw = prompt(`Mật khẩu mới cho ${u.name}:`);
    if (!pw) return;
    try {
      await api.resetPassword(u.id, pw);
      setNotice(`Đã đặt lại mật khẩu cho ${u.name}.`);
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : 'Thất bại');
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Tài khoản</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Thêm tài khoản
        </Button>
      </div>

      {notice && (
        <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</div>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Tên</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Vai trò</th>
              <th className="px-4 py-3 font-medium">Chi nhánh</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!users ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <Spinner className="mx-auto" />
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {u.name}
                    {u.isFieldStaff && <span className="ml-2 text-xs text-slate-400">(shipper)</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge color={u.role === 'admin' ? 'red' : u.role === 'accountant' ? 'blue' : 'slate'}>
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{branchName(u.branchId)}</td>
                  <td className="px-4 py-3">
                    <Badge color={u.isActive ? 'green' : 'slate'}>
                      {u.isActive ? 'Hoạt động' : 'Khoá'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-slate-400 hover:text-red-600"
                      title="Đặt lại mật khẩu"
                      onClick={() => resetPassword(u)}
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {showCreate && (
        <CreateUserModal
          branches={branches}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  branches,
  onClose,
  onCreated,
}: {
  branches: Branch[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'staff' as Role,
    branchId: '',
    isFieldStaff: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.createUser({
        email: form.email,
        password: form.password,
        name: form.name,
        role: form.role,
        branchId: form.role === 'admin' ? null : form.branchId || null,
        isFieldStaff: form.isFieldStaff,
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
      <Card className="w-full max-w-md p-6">
        <div onClick={(e) => e.stopPropagation()}>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Thêm tài khoản</h2>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Họ tên *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu *</label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Vai trò</label>
                <Select
                  className="w-full"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                >
                  <option value="staff">Nhân viên</option>
                  <option value="accountant">Kế toán</option>
                  <option value="admin">Quản trị</option>
                </Select>
              </div>
              {form.role !== 'admin' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Chi nhánh *</label>
                  <Select
                    className="w-full"
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    required
                  >
                    <option value="">— Chọn —</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
            {form.role === 'staff' && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isFieldStaff}
                  onChange={(e) => setForm({ ...form, isFieldStaff: e.target.checked })}
                />
                Là nhân viên hiện trường (shipper)
              </label>
            )}
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
