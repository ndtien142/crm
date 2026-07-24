import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { Card, Spinner } from '../lib/ui';

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useSession();
  const [stats, setStats] = useState<{ customers: number; branches: number } | null>(null);

  useEffect(() => {
    Promise.all([api.listCustomers({ pageSize: 1 }), api.listBranches({ pageSize: 1 })])
      .then(([c, b]) => setStats({ customers: c.meta.total, branches: b.meta.total }))
      .catch(() => setStats({ customers: 0, branches: 0 }));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Xin chào, {user?.name}</h1>
      <p className="text-slate-500">Tổng quan hệ thống chăm sóc khách hàng PCCC.</p>
      {!stats ? (
        <div className="mt-8">
          <Spinner />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Khách hàng" value={stats.customers} />
          <Stat label="Chi nhánh" value={stats.branches} />
          <Stat label="Đến hạn 30 ngày" value="—" hint="Kích hoạt cùng phiếu dịch vụ (P2)" />
        </div>
      )}
    </div>
  );
}
