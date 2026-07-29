import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@firecare/ui';
import { useQuery } from '@tanstack/react-query';
import { Building2, CalendarClock, TrendingUp, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import { CUSTOMER_STATUSES, CUSTOMER_TYPES } from '../lib/labels';
import { useBranches } from '../lib/queries';
import { useAuth } from '../store/auth';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const user = useAuth((s) => s.user);
  const customers = useQuery({
    queryKey: ['customers', 'dashboard'],
    queryFn: () => api.listCustomers({ pageSize: 100 }),
  });
  const branches = useBranches();

  const items = customers.data?.items ?? [];
  const total = customers.data?.meta.total ?? 0;
  const byType = CUSTOMER_TYPES.map((t) => ({
    name: t.label,
    value: items.filter((c) => c.type === t.value).length,
  })).filter((d) => d.value > 0);
  const byStatus = CUSTOMER_STATUSES.map((s) => ({
    name: s.label,
    value: items.filter((c) => c.status === s.value).length,
  })).filter((d) => d.value > 0);

  const loading = customers.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Xin chào, {user?.name}</h1>
        <p className="text-muted-foreground">Tổng quan hệ thống chăm sóc khách hàng PCCC.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Khách hàng"
          value={loading ? <Skeleton className="h-7 w-12" /> : total}
          icon={<Users className="size-5" />}
        />
        <StatCard
          label="Chi nhánh"
          value={branches.isLoading ? <Skeleton className="h-7 w-8" /> : (branches.data?.meta.total ?? 0)}
          icon={<Building2 className="size-5" />}
        />
        <StatCard
          label="Đến hạn 30 ngày"
          value="—"
          hint="Kích hoạt cùng phiếu dịch vụ (P2)"
          icon={<CalendarClock className="size-5" />}
        />
        <StatCard
          label="Doanh thu tháng"
          value="—"
          hint="Báo cáo (P5)"
          icon={<TrendingUp className="size-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Khách hàng theo loại</CardTitle>
            <CardDescription>Phân bố theo nhóm khách hàng</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : byType.length === 0 ? (
              <div className="grid h-[260px] place-items-center text-sm text-muted-foreground">
                Chưa có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byType} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--popover-foreground)',
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--chart-1)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Khách hàng theo trạng thái</CardTitle>
            <CardDescription>Tỷ lệ trạng thái chăm sóc</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : byStatus.length === 0 ? (
              <div className="grid h-[260px] place-items-center text-sm text-muted-foreground">
                Chưa có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={byStatus}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    label={(e: { name: string; value: number }) => `${e.name}: ${e.value}`}
                    labelLine={false}
                  >
                    {byStatus.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--popover-foreground)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
