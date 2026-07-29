import type { Customer } from '@firecare/types';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
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
import {
  CUSTOMER_STATUSES,
  CUSTOMER_TYPES,
  customerStatusLabel,
  customerTypeLabel,
  STATUS_BADGE,
} from '../lib/labels';
import { useBranches } from '../lib/queries';
import { useAuth } from '../store/auth';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const TOOLTIP_STYLE = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--popover-foreground)',
  fontSize: 12,
  boxShadow: '0 4px 16px rgb(0 0 0 / 0.08)',
} as const;

function StatCard({
  label,
  value,
  hint,
  icon,
  tint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  tint: string;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn('grid size-11 shrink-0 place-items-center rounded-xl', tint)}>{icon}</div>
        <div className="min-w-0">
          <div className="truncate text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {hint && <div className="truncate text-xs text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();
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
    key: s.value,
    name: s.label,
    value: items.filter((c) => c.status === s.value).length,
  })).filter((d) => d.value > 0);
  const recent = items.slice(0, 5);
  const loading = customers.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Xin chào, {user?.name} 👋</h1>
        <p className="text-muted-foreground">Tổng quan hệ thống chăm sóc khách hàng PCCC.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Khách hàng"
          value={loading ? <Skeleton className="h-7 w-12" /> : total}
          hint="Tổng số khách"
          icon={<Users className="size-5" />}
          tint="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          label="Chi nhánh"
          value={branches.isLoading ? <Skeleton className="h-7 w-8" /> : (branches.data?.meta.total ?? 0)}
          hint="Đang hoạt động"
          icon={<Building2 className="size-5" />}
          tint="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        />
        <StatCard
          label="Đến hạn 30 ngày"
          value="—"
          hint="Kích hoạt cùng phiếu dịch vụ (P2)"
          icon={<CalendarClock className="size-5" />}
          tint="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="Doanh thu tháng"
          value="—"
          hint="Báo cáo (P5)"
          icon={<TrendingUp className="size-5" />}
          tint="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Khách hàng theo loại</CardTitle>
            <CardDescription>Phân bố theo nhóm khách hàng</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : byType.length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byType} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.35} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  />
                  <Tooltip cursor={{ fill: 'var(--muted)' }} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="url(#barGrad)" maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Theo trạng thái</CardTitle>
            <CardDescription>Tỷ lệ trạng thái chăm sóc</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : byStatus.length === 0 ? (
              <Empty />
            ) : (
              <>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={byStatus}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={62}
                        outerRadius={88}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {byStatus.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold">{total}</div>
                    <div className="text-xs text-muted-foreground">khách hàng</div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {byStatus.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="ml-auto font-medium">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Khách hàng gần đây</CardTitle>
          <CardDescription>Những khách hàng mới cập nhật</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="my-2 h-10 w-full" />)
          ) : recent.length === 0 ? (
            <Empty />
          ) : (
            recent.map((c: Customer) => (
              <div key={c.id} className="flex items-center gap-3 py-3">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {initials(c.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {customerTypeLabel(c.type)}
                    {c.phone ? ` · ${c.phone}` : ''}
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={cn('ml-auto border-transparent', STATUS_BADGE[c.status])}
                >
                  {customerStatusLabel(c.status)}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Empty() {
  return (
    <div className="grid h-[220px] place-items-center text-sm text-muted-foreground">
      Chưa có dữ liệu
    </div>
  );
}
