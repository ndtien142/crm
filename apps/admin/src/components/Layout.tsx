import type { Role } from '@firecare/types';
import {
  CalendarDays,
  Flame,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MapPin,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSession } from '../lib/session';
import { Button, cn } from '../lib/ui';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Bảng điều khiển', icon: LayoutDashboard, end: true },
  { to: '/khach-hang', label: 'Khách hàng', icon: Users },
  { to: '/cham-soc', label: 'Chăm sóc', icon: HeartHandshake },
  { to: '/lich', label: 'Lịch hẹn', icon: CalendarDays },
  { to: '/ban-do', label: 'Bản đồ điểm', icon: MapPin },
  { to: '/tai-khoan', label: 'Tài khoản', icon: ShieldCheck, roles: ['admin'] },
];

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Quản trị',
  accountant: 'Kế toán',
  staff: 'Nhân viên',
};

export default function Layout() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const items = NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role)));

  return (
    <div className="flex h-full">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-4 text-lg font-bold text-slate-900">
          <Flame className="h-6 w-6 text-red-600" /> FireCare
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              <n.icon className="h-5 w-5" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 px-2">
            <div className="text-sm font-medium text-slate-900">{user?.name}</div>
            <div className="text-xs text-slate-500">{user ? ROLE_LABEL[user.role] : ''}</div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            <LogOut className="h-4 w-4" /> Đăng xuất
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
